/**
 * A minimal element description shared by every renderer.
 *
 * Components that hold no state return one of these instead of framework
 * elements, so React, the custom element, and anything added later all build
 * their output from one implementation. There is no diffing and no lifecycle
 * here — it describes a tree once, and each renderer walks it.
 *
 * Text is carried as strings and never as markup, so a renderer creates text
 * nodes rather than assigning innerHTML.
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

/**
 * Marks where the caller's own children belong.
 *
 * A component describes its wrapper; the renderer owns what goes inside,
 * because children are other components and prose it already knows how to
 * render.
 */
export const SLOT = Symbol.for('mdocui.slot')

export type VNode = VElement | string | number | typeof SLOT | null | undefined | false

/** Build an element description. */
export function h(tag: string, attrs: VAttrs = {}, ...children: VNode[]): VElement {
	return { tag, attrs, children: children.flat() }
}

export function isVElement(node: VNode): node is VElement {
	return typeof node === 'object' && node !== null && 'tag' in node
}

/**
 * Drop the decorative inline styles when a caller supplies a class.
 *
 * Components carry inline styles so they look right with no stylesheet, but a
 * caller passing a className is styling them itself and inline styles would
 * win over its CSS.
 */
export function styleUnless(className: string | undefined, style: VStyle): VStyle | undefined {
	return className ? undefined : style
}
