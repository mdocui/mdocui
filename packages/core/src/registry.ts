import type { z } from 'zod'
import type { ComponentDefinition, ValidationResult } from './types'

/** Type helper — returns the definition unchanged. */
export function defineComponent(definition: ComponentDefinition): ComponentDefinition {
	return definition
}

export interface RegistryOptions {
	/**
	 * LLM-friendly mode: when validation fails, fall back to raw props
	 * instead of rejecting. Use with z.coerce.* in definitions for best results.
	 *
	 * WARNING: When fallback activates, props bypass all type guarantees.
	 * Component renderers must be defensive about prop types.
	 */
	coerce?: boolean
}

export class ComponentRegistry {
	private components = new Map<string, ComponentDefinition>()
	private coerce: boolean

	constructor(options?: RegistryOptions) {
		this.coerce = options?.coerce ?? false
	}

	register(definition: ComponentDefinition): this {
		this.components.set(definition.name, definition)
		return this
	}

	registerAll(definitions: ComponentDefinition[]): this {
		for (const def of definitions) this.register(def)
		return this
	}

	get(name: string): ComponentDefinition | undefined {
		return this.components.get(name)
	}

	has(name: string): boolean {
		return this.components.has(name)
	}

	names(): string[] {
		return [...this.components.keys()]
	}

	all(): ComponentDefinition[] {
		return [...this.components.values()]
	}

	knownTags(): Set<string> {
		return new Set(this.components.keys())
	}

	validate(tagName: string, props: Record<string, unknown>): ValidationResult {
		const def = this.components.get(tagName)
		if (!def) {
			return { valid: false, errors: [`Unknown component: ${tagName}`] }
		}

		const result = def.props.safeParse(props)
		if (result.success) {
			return { valid: true, errors: [], props: result.data as Record<string, unknown> }
		}

		// In coerce mode, fall back to raw props instead of rejecting
		if (this.coerce) {
			return { valid: true, errors: [], props }
		}

		return {
			valid: false,
			errors: result.error.issues.map(
				(issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`,
			),
		}
	}
}
