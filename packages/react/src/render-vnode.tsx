import { isVElement, SLOT, type VNode } from '@mdocui/core'
import { createElement, type ReactNode } from 'react'

// React spells two HTML attributes differently.
const ATTR_ALIAS: Record<string, string> = { class: 'className', for: 'htmlFor' }

/**
 * Render a shared component description as React elements.
 *
 * `slot` is what the caller passed as children — the description says where
 * they belong, the renderer supplies them.
 */
export function renderVNode(node: VNode, slot: ReactNode, key?: string): ReactNode {
	if (node === null || node === undefined || node === false) return null
	if (node === SLOT) return slot
	if (typeof node === 'string' || typeof node === 'number') return node
	if (!isVElement(node)) return null

	const props: Record<string, unknown> = key === undefined ? {} : { key }
	for (const [name, value] of Object.entries(node.attrs)) {
		if (value === undefined) continue
		props[ATTR_ALIAS[name] ?? name] = value
	}

	const children = node.children.map((child, i) => renderVNode(child, slot, `${key ?? 'v'}-${i}`))

	return createElement(node.tag, props, ...(children.length > 0 ? children : []))
}
