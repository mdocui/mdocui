import {
	type ActionEvent,
	type ASTNode,
	accordion,
	badge,
	buttonGroup,
	type ComponentNode,
	callout,
	card,
	chart,
	codeBlock,
	divider,
	grid,
	image,
	type ProseNode,
	progress,
	stack,
	stat,
	tab,
	table,
} from '@mdocui/core'
import { append, renderVNode } from './dom'
import type { InteractiveArgs } from './interactive'
import * as interactive from './interactive'
import { renderProse } from './prose'

/** Components with no state: described once in core, rendered here. */
const STATIC = {
	accordion,
	badge,
	'button-group': buttonGroup,
	callout,
	card,
	chart,
	'code-block': codeBlock,
	divider,
	grid,
	image,
	progress,
	stack,
	stat,
	tab,
	table,
} as const

/** Components that need event handling or their own state. */
const INTERACTIVE = {
	button: interactive.button,
	checkbox: interactive.checkbox,
	form: interactive.form,
	input: interactive.input,
	link: interactive.link,
	select: interactive.select,
	tabs: interactive.tabs,
	textarea: interactive.textarea,
	toggle: interactive.toggle,
} as const

export type CustomRenderer = (args: InteractiveArgs & { name: string }) => Node | null

export interface RenderOptions {
	isStreaming: () => boolean
	emit: (event: ActionEvent) => void
	onError?: (name: string, error: Error, props: Record<string, unknown>) => void
	classNames?: Record<string, string>
	components?: Record<string, CustomRenderer>
}

let counter = 0
/** Ids must be unique per instance — the same field name can appear twice. */
function nextUid(): string {
	counter += 1
	return String(counter)
}

export function renderNode(node: ASTNode, opts: RenderOptions): Node | null {
	if (node.type === 'prose') {
		return renderProse((node as ProseNode).content)
	}

	const component = node as ComponentNode
	const name = component.name
	const props = component.props ?? {}
	const className = opts.classNames?.[name]

	// Children are rendered first so a component can place them wherever its
	// description says, and so a failure inside one is caught with the parent.
	let slot: Node[] | null = null
	const kids = component.children ?? []
	if (kids.length > 0) {
		slot = []
		kids.forEach((child) => {
			const rendered = renderNode(child, opts)
			if (rendered) (slot as Node[]).push(rendered)
		})
	}

	const args: InteractiveArgs = {
		props,
		className,
		isStreaming: opts.isStreaming,
		emit: opts.emit,
		slot,
		uid: nextUid,
	}

	try {
		const custom = opts.components?.[name]
		if (custom) return custom({ ...args, name })

		const staticSpec = STATIC[name as keyof typeof STATIC]
		if (staticSpec) {
			const out = renderVNode(staticSpec({ props, className }), slot)
			return Array.isArray(out) ? wrap(out) : out
		}

		const build = INTERACTIVE[name as keyof typeof INTERACTIVE]
		if (build) return build(args)
	} catch (error) {
		// One broken component must not take the rest of the message with it.
		opts.onError?.(name, error as Error, props)
		return null
	}

	return null
}

function wrap(nodes: Node[]): Node {
	const frag = document.createDocumentFragment()
	for (const n of nodes) frag.appendChild(n)
	return frag
}

export function renderNodes(nodes: ASTNode[], opts: RenderOptions): DocumentFragment {
	const frag = document.createDocumentFragment()
	for (const node of nodes) append(frag, renderNode(node, opts))
	return frag
}
