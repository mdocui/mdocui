import { isVElement, SLOT, type VNode } from '@mdocui/core'

// Attribute names that must be set as properties, not attributes.
const BOOLEAN_PROPS = new Set(['disabled', 'checked', 'required', 'open', 'selected'])

function applyStyle(el: HTMLElement, style: Record<string, string | number | undefined>): void {
	for (const [prop, value] of Object.entries(style)) {
		if (value === undefined) continue
		;(el.style as unknown as Record<string, string>)[prop] = String(value)
	}
}

/**
 * Build DOM from a shared element description. `slot` goes wherever the
 * description says. Text becomes a text node, so markup in model output shows
 * up as text instead of running.
 */
export function renderVNode(node: VNode, slot: Node | Node[] | null): Node | Node[] | null {
	if (node === null || node === undefined || node === false) return null
	if (node === SLOT) return slot
	if (typeof node === 'string' || typeof node === 'number') {
		return document.createTextNode(String(node))
	}
	if (!isVElement(node)) return null

	const el = document.createElement(node.tag)

	for (const [name, value] of Object.entries(node.attrs)) {
		if (value === undefined) continue
		if (name === 'style') {
			applyStyle(el, value as Record<string, string | number | undefined>)
			continue
		}
		if (typeof value === 'boolean') {
			// "" for real boolean attributes, "true" for data-*, same as React.
			if (value) el.setAttribute(name, BOOLEAN_PROPS.has(name) ? '' : 'true')
			continue
		}
		el.setAttribute(name, String(value))
	}

	for (const child of node.children) {
		append(el, renderVNode(child, slot))
	}

	return el
}

/** Append a node, a list of nodes, or nothing. */
export function append(parent: Node, child: Node | Node[] | null): void {
	if (child === null) return
	if (Array.isArray(child)) {
		for (const c of child) parent.appendChild(c)
		return
	}
	parent.appendChild(child)
}

/** Remove every child of a node. */
export function clear(el: Node): void {
	while (el.firstChild) el.removeChild(el.firstChild)
}
