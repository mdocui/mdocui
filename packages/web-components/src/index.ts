// @mdocui/web-components: custom element renderer for mdocUI

export { append, clear, renderVNode } from './dom'
export type { MdocUIErrorDetail } from './element'
export { ACTION_EVENT, defineMdocUI, ERROR_EVENT, MdocUIElement } from './element'
export type { InteractiveArgs } from './interactive'
export { renderProse } from './prose'
export type { CustomRenderer, RenderOptions } from './render'
export { renderNode, renderNodes } from './render'

import { defineMdocUI } from './element'

// Registering on import means a plain script tag is enough. defineMdocUI
// guards against double-registration and against there being no DOM.
defineMdocUI()
