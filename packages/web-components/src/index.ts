// @mdocui/web-components — custom element renderer for mdocUI

export { append, clear, renderVNode } from './dom'
export type { MdocUIErrorDetail } from './element'
export { ACTION_EVENT, defineMdocUI, ERROR_EVENT, MdocUIElement } from './element'
export type { InteractiveArgs } from './interactive'
export { renderProse } from './prose'
export type { CustomRenderer, RenderOptions } from './render'
export { renderNode, renderNodes } from './render'

import { defineMdocUI } from './element'

// Importing the package registers <mdoc-ui>, so a script tag is enough to use
// it. Both guards inside defineMdocUI make this inert on a server and harmless
// if the package is loaded twice.
defineMdocUI()
