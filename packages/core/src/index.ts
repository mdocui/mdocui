// @mdocui/core — Streaming Markdoc parser for LLM generative UI

export { parseAttributes } from './attributes'
export type { PureArgs } from './components/content'
export { badge, callout, codeBlock, divider, image, safeSrc } from './components/content'
export { chart, describeChart, progress, stat, table } from './components/data'
export { accordion, buttonGroup, card, grid, stack, tab } from './components/layout'
export { allDefinitions, defaultGroups } from './definitions'
export type { ParserOptions } from './parser'
export { StreamingParser } from './parser'
export { generatePrompt } from './prompt'
export type { InlineToken, ProseBlock } from './prose'
export { parseBlocks, parseInline, sanitizeHref } from './prose'
export type { RegistryOptions } from './registry'
export { ComponentRegistry, defineComponent } from './registry'
export type { Token } from './tokenizer'
export { Tokenizer, TokenizerState, TokenType } from './tokenizer'
export type {
	ActionEvent,
	ASTNode,
	ComponentDefinition,
	ComponentGroup,
	ComponentNode,
	ParseError,
	ParseMeta,
	PromptOptions,
	ProseNode,
	ValidationResult,
} from './types'
export type { VAttrs, VElement, VNode, VStyle } from './vnode'
export { h, isVElement, SLOT, styleUnless } from './vnode'
