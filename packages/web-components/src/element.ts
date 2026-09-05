import {
	type ActionEvent,
	type ASTNode,
	allDefinitions,
	ComponentRegistry,
	type ProseNode,
	StreamingParser,
} from '@mdocui/core'
import { clear } from './dom'
import { releaseStreamDisabled } from './interactive'
import { type CustomRenderer, renderNode } from './render'

export const ACTION_EVENT = 'mdocui:action'
export const ERROR_EVENT = 'mdocui:error'

export interface MdocUIErrorDetail {
	componentName: string
	error: Error
	props: Record<string, unknown>
}

/**
 * Renders mdocUI markup into light DOM, so page CSS reaches the components.
 *
 * Only the tail is re-rendered while streaming. The parser emits a component
 * once its closing tag arrives, so anything interactive is already final by
 * the time it hits the DOM.
 */
export class MdocUIElement extends HTMLElement {
	private parser: StreamingParser | null = null
	private registryValue: ComponentRegistry | null = null
	private rendered: (Node | null)[] = []
	// A count, not the array. getNodes() hands back the parser's own array, so
	// keeping a reference would mean comparing it to itself.
	private renderedCount = 0
	// Lets us skip rebuilding the tail when it hasn't actually changed.
	private lastSignature = ''
	private streaming = false

	classNames: Record<string, string> = {}
	components: Record<string, CustomRenderer> = {}

	get registry(): ComponentRegistry {
		if (!this.registryValue) {
			const registry = new ComponentRegistry({ coerce: true })
			registry.registerAll(allDefinitions)
			this.registryValue = registry
		}
		return this.registryValue
	}

	set registry(value: ComponentRegistry) {
		this.registryValue = value
		this.parser = null
	}

	/** Replace the content in one go. */
	set markup(value: string) {
		this.reset()
		this.push(value)
		this.done()
	}

	get isStreaming(): boolean {
		return this.streaming
	}

	connectedCallback(): void {
		if (!this.hasAttribute('data-mdocui-root')) {
			this.setAttribute('data-mdocui-root', 'true')
		}
	}

	/** Feed the next chunk of a streaming response. */
	push(chunk: string): void {
		if (!this.parser) {
			this.parser = new StreamingParser({ knownTags: this.registry.knownTags() })
		}
		this.streaming = true
		this.parser.write(chunk)
		this.sync()
	}

	/** Close the stream, flushing anything the parser is still holding. */
	done(): void {
		this.parser?.flush()
		this.streaming = false
		this.sync(true)
	}

	/** Clear the element and start over. */
	reset(): void {
		this.parser = null
		this.renderedCount = 0
		this.lastSignature = ''
		this.rendered = []
		this.streaming = false
		clear(this)
	}

	getNodes(): ASTNode[] {
		return this.parser?.getNodes() ?? []
	}

	private emit = (event: ActionEvent): void => {
		this.dispatchEvent(new CustomEvent(ACTION_EVENT, { detail: event, bubbles: true }))
	}

	private onError = (componentName: string, error: Error, props: Record<string, unknown>): void => {
		this.dispatchEvent(
			new CustomEvent<MdocUIErrorDetail>(ERROR_EVENT, {
				detail: { componentName, error, props },
				bubbles: true,
			}),
		)
	}

	/**
	 * Catch the DOM up with the parser. Nodes never change once settled, so we
	 * only touch the tail. That's what keeps focus and typed input intact.
	 */
	private sync(final = false): void {
		const next = this.parser?.getNodes() ?? []
		const opts = {
			isStreaming: () => this.streaming,
			emit: this.emit,
			onError: this.onError,
			classNames: this.classNames,
			components: this.components,
		}

		// The old tail may have grown. Once it stops changing, leave it be.
		const lastIndex = this.renderedCount - 1
		if (lastIndex >= 0 && next[lastIndex]) {
			const signature = signatureOf(next[lastIndex])
			if (signature !== this.lastSignature) {
				this.replaceAt(lastIndex, renderNode(next[lastIndex], opts, lastIndex))
			}
		}

		for (let i = this.renderedCount; i < next.length; i++) {
			const el = renderNode(next[i], opts, i)
			this.rendered[i] = el
			if (el) this.appendChild(el)
		}
		this.renderedCount = next.length
		this.lastSignature = next.length > 0 ? signatureOf(next[next.length - 1]) : ''

		// Re-enable rather than rebuild, or we'd wipe a half-filled form.
		if (final) releaseStreamDisabled(this)
	}

	private replaceAt(index: number, replacement: Node | null): void {
		const old = this.rendered[index]
		if (!replacement) return
		if (old?.parentNode === this) {
			this.replaceChild(replacement, old)
		} else {
			this.appendChild(replacement)
		}
		this.rendered[index] = replacement
	}
}

/** Cheap identity, to tell a growing node from a settled one. */
function signatureOf(node: ASTNode): string {
	return node.type === 'prose' ? `p:${(node as ProseNode).content}` : JSON.stringify(node)
}

let baseRegistered = false

/** Safe to call twice, and a no-op where there's no DOM (SSR). */
export function defineMdocUI(tagName = 'mdoc-ui'): void {
	if (typeof customElements === 'undefined') return
	if (customElements.get(tagName)) return
	// A class can only back one tag name, so extra names get a subclass.
	const Ctor = baseRegistered ? class extends MdocUIElement {} : MdocUIElement
	customElements.define(tagName, Ctor)
	baseRegistered = true
}
