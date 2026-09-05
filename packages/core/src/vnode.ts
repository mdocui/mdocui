/**
 * Element description shared by every renderer.
 *
 * Stateless components return one of these instead of framework elements, so
 * each renderer walks the same tree. No diffing, no lifecycle. Text stays a
 * string, never markup.
 */

export type VStyle = Record<string, string | number | undefined>

export type VAttrValue = string | number | boolean | undefined

export interface VAttrs {
	style?: VStyle
	[key: string]: VAttrValue | VStyle
}

export interface VElement {
	tag: string
	attrs: VAttrs
	children: VNode[]
}

/** Where the caller's children go. The renderer supplies them. */
export const SLOT = Symbol.for('mdocui.slot')

export type VNode = VElement | string | number | typeof SLOT | null | undefined | false

/** Build an element description. */
export function h(tag: string, attrs: VAttrs = {}, ...children: VNode[]): VElement {
	return { tag, attrs, children: children.flat() }
}

export function isVElement(node: VNode): node is VElement {
	return typeof node === 'object' && node !== null && 'tag' in node
}

/** Drop the default inline styles when the caller brings its own class. */
export function styleUnless(className: string | undefined, style: VStyle): VStyle | undefined {
	return className ? undefined : style
}
