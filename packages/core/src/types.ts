import type { z } from 'zod'

export interface ComponentDefinition {
	name: string
	description: string
	props: z.ZodObject<z.ZodRawShape>
	children?: 'none' | 'any' | string[]
	streaming?: Record<string, boolean>
}

export interface ProseNode {
	type: 'prose'
	content: string
}

export interface ComponentNode {
	type: 'component'
	name: string
	props: Record<string, unknown>
	children: ASTNode[]
	selfClosing: boolean
}

export type ASTNode = ProseNode | ComponentNode

export interface ActionEvent {
	type: 'button_click' | 'form_submit' | 'select_change' | 'link_click'
	action: string
	label?: string
	formName?: string
	formState?: Record<string, unknown>
	tagName: string
	params?: Record<string, unknown>
}

export interface ComponentGroup {
	name: string
	components: string[]
	notes?: string[]
}

export interface PromptOptions {
	preamble?: string
	additionalRules?: string[]
	examples?: string[]
	groups?: ComponentGroup[]
	verbosity?: 'minimal' | 'default' | 'detailed'
}

export interface ParseError {
	code: 'unknown_tag' | 'validation' | 'malformed' | 'unclosed'
	tagName: string
	message: string
	raw?: string
}

export interface ParseMeta {
	errors: ParseError[]
	nodeCount: number
	isComplete: boolean
	pendingTag?: string
	bufferLength?: number
}

export interface ValidationResult {
	valid: boolean
	errors: string[]
	props?: Record<string, unknown>
}
