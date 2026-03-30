import { parseAttributes } from './attributes'
import type { Token } from './tokenizer'
import { Tokenizer, TokenType } from './tokenizer'
import type { ASTNode, ComponentNode, ParseError, ParseMeta, ProseNode } from './types'

export interface ParserOptions {
	dropUnknown?: boolean
	knownTags?: Set<string>
}

export class StreamingParser {
	private tokenizer = new Tokenizer()
	private completedNodes: ASTNode[] = []
	private bodyStack: BodyFrame[] = []
	private errors: ParseError[] = []
	private options: Required<ParserOptions>

	constructor(options?: ParserOptions) {
		this.options = {
			dropUnknown: options?.dropUnknown ?? true,
			knownTags: options?.knownTags ?? new Set(),
		}
	}

	write(chunk: string): ASTNode[] {
		const tokens = this.tokenizer.write(chunk)
		const newNodes: ASTNode[] = []

		for (const token of tokens) {
			newNodes.push(...this.processToken(token))
		}

		// Merge leading prose node with last completed node if both are prose
		if (
			newNodes.length > 0 &&
			newNodes[0].type === 'prose' &&
			this.completedNodes.length > 0 &&
			this.completedNodes[this.completedNodes.length - 1].type === 'prose'
		) {
			const lastCompleted = this.completedNodes[this.completedNodes.length - 1] as ProseNode
			lastCompleted.content += (newNodes[0] as ProseNode).content
			this.completedNodes.push(...newNodes.slice(1))
		} else {
			this.completedNodes.push(...newNodes)
		}

		return newNodes
	}

	/** Flush remaining buffers. Open body tags are force-closed. */
	flush(): ASTNode[] {
		const remaining = this.tokenizer.flush()
		const newNodes: ASTNode[] = []

		for (const token of remaining) {
			newNodes.push(...this.processToken(token))
		}

		while (this.bodyStack.length > 0) {
			const frame = this.popFrame()
			this.errors.push({
				code: 'unclosed',
				tagName: frame.name,
				message: `Tag "{% ${frame.name} %}" was never closed`,
			})
			const node = this.buildComponentNode(frame)
			if (this.isInBody()) {
				this.currentFrame().children.push(node)
			} else {
				newNodes.push(node)
			}
		}

		this.completedNodes.push(...newNodes)
		return newNodes
	}

	getNodes(): ASTNode[] {
		return this.completedNodes
	}

	getMeta(): ParseMeta {
		const tokenizerState = this.tokenizer.getState()
		const buffer = this.tokenizer.getBuffer()
		const isBuffering = tokenizerState === 'IN_TAG' || tokenizerState === 'IN_STRING'

		let pendingTag: string | undefined
		if (isBuffering && buffer.length > 2) {
			const inner = buffer.slice(2).trim()
			const spaceIdx = inner.indexOf(' ')
			const rawName = spaceIdx === -1 ? inner : inner.slice(0, spaceIdx)
			const name = rawName.endsWith('/') ? rawName.slice(0, -1) : rawName
			if (name && !name.startsWith('/')) {
				pendingTag = name
			}
		}

		return {
			errors: [...this.errors],
			nodeCount: this.completedNodes.length,
			isComplete: this.bodyStack.length === 0 && !isBuffering,
			pendingTag: isBuffering ? pendingTag : undefined,
			bufferLength: isBuffering ? buffer.length : undefined,
		}
	}

	reset(): void {
		this.tokenizer.reset()
		this.completedNodes = []
		this.bodyStack = []
		this.errors = []
	}

	private processToken(token: Token): ASTNode[] {
		const nodes: ASTNode[] = []

		switch (token.type) {
			case TokenType.PROSE:
				this.handleProse(token.raw, nodes)
				break
			case TokenType.TAG_SELF_CLOSE:
				this.handleSelfClose(token, nodes)
				break
			case TokenType.TAG_OPEN:
				this.handleOpen(token)
				break
			case TokenType.TAG_CLOSE:
				this.handleClose(token, nodes)
				break
		}

		return nodes
	}

	private handleProse(content: string, out: ASTNode[]): void {
		if (content.length === 0) return

		const target = this.isInBody() ? this.currentFrame().children : out
		const last = target.length > 0 ? target[target.length - 1] : null

		// Merge consecutive prose nodes instead of creating fragments
		if (last && last.type === 'prose') {
			last.content += content
		} else {
			target.push({ type: 'prose', content } as ProseNode)
		}
	}

	private handleSelfClose(token: Token, out: ASTNode[]): void {
		const name = token.name ?? ''
		if (!this.isKnown(name)) {
			this.errors.push({
				code: 'unknown_tag',
				tagName: name,
				message: `Unknown component: ${name}`,
				raw: token.raw,
			})
			if (!this.options.dropUnknown) {
				this.handleProse(token.raw, out)
			}
			return
		}

		const props = parseAttributes(token.attrs ?? '')
		const node: ComponentNode = {
			type: 'component',
			name,
			props,
			children: [],
			selfClosing: true,
		}

		if (this.isInBody()) {
			this.currentFrame().children.push(node)
		} else {
			out.push(node)
		}
	}

	private handleOpen(token: Token): void {
		const name = token.name ?? ''
		if (!this.isKnown(name)) {
			this.errors.push({
				code: 'unknown_tag',
				tagName: name,
				message: `Unknown component: ${name}`,
				raw: token.raw,
			})
			return
		}

		this.bodyStack.push({
			name,
			props: parseAttributes(token.attrs ?? ''),
			children: [],
		})
	}

	private handleClose(token: Token, out: ASTNode[]): void {
		const name = token.name ?? ''

		let frameIdx = -1
		for (let i = this.bodyStack.length - 1; i >= 0; i--) {
			if (this.bodyStack[i].name === name) {
				frameIdx = i
				break
			}
		}

		if (frameIdx === -1) {
			this.errors.push({
				code: 'malformed',
				tagName: name,
				message: `Closing tag "{% /${name} %}" has no matching opening tag`,
				raw: token.raw,
			})
			return
		}

		// force-close anything nested above the matching opener
		while (this.bodyStack.length > frameIdx + 1) {
			const orphan = this.popFrame()
			this.errors.push({
				code: 'unclosed',
				tagName: orphan.name,
				message: `Tag "{% ${orphan.name} %}" was force-closed by "{% /${name} %}"`,
			})
			const orphanNode = this.buildComponentNode(orphan)
			this.bodyStack[this.bodyStack.length - 1].children.push(orphanNode)
		}

		const frame = this.popFrame()
		const node = this.buildComponentNode(frame)

		if (this.isInBody()) {
			this.currentFrame().children.push(node)
		} else {
			out.push(node)
		}
	}

	private buildComponentNode(frame: BodyFrame): ComponentNode {
		return {
			type: 'component',
			name: frame.name,
			props: frame.props,
			children: frame.children,
			selfClosing: false,
		}
	}

	private popFrame(): BodyFrame {
		return this.bodyStack.pop() as BodyFrame
	}

	private isInBody(): boolean {
		return this.bodyStack.length > 0
	}

	private currentFrame(): BodyFrame {
		return this.bodyStack[this.bodyStack.length - 1]
	}

	private isKnown(name: string): boolean {
		if (this.options.knownTags.size === 0) return true
		return this.options.knownTags.has(name)
	}
}

interface BodyFrame {
	name: string
	props: Record<string, unknown>
	children: ASTNode[]
}
