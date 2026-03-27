import { parseAttributes } from './attributes'
import { TokenType, Tokenizer } from './tokenizer'
import type { Token } from './tokenizer'
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

		this.completedNodes.push(...newNodes)
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
		return {
			errors: [...this.errors],
			nodeCount: this.completedNodes.length,
			isComplete: this.bodyStack.length === 0,
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

		const node: ProseNode = { type: 'prose', content }
		if (this.isInBody()) {
			this.currentFrame().children.push(node)
		} else {
			out.push(node)
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
