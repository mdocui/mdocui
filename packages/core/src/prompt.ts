import type { ComponentRegistry } from './registry'
import type { ComponentDefinition, PromptOptions } from './types'

export function generatePrompt(registry: ComponentRegistry, options?: PromptOptions): string {
	const sections: string[] = []
	const verbosity = options?.verbosity ?? 'default'
	const compact = verbosity === 'minimal'

	if (options?.preamble) {
		sections.push(options.preamble, '')
	}

	sections.push('You respond in mdocUI format.', '')

	if (!compact) {
		sections.push(
			'Write natural markdown prose. Embed UI components using Markdoc tag syntax.',
			'',
			'## TAG SYNTAX',
			'Self-closing: {% tagname attr="value" attr2=123 /%}',
			'With body:    {% tagname attr="value" %}',
			'                content here',
			'              {% /tagname %}',
			'',
			'Never wrap tags in code fences.',
			'Never invent component names not listed below.',
			'Unknown tags will be silently dropped.',
			'',
		)
	}

	const defs = registry.all()
	if (defs.length > 0) {
		sections.push('## COMPONENTS', '')

		const formatter = compact ? formatComponentCompact : formatComponent

		if (options?.groups && options.groups.length > 0) {
			const grouped = new Set<string>()

			for (const group of options.groups) {
				sections.push(`### ${group.name}`)
				if (!compact && group.notes) {
					for (const note of group.notes) sections.push(`> ${note}`)
				}
				sections.push('')
				for (const name of group.components) {
					const def = registry.get(name)
					if (def) {
						sections.push(formatter(def), '')
						grouped.add(name)
					}
				}
			}

			for (const def of defs) {
				if (!grouped.has(def.name)) sections.push(formatter(def), '')
			}
		} else {
			for (const def of defs) sections.push(formatter(def), '')
		}
	}

	if (!compact) {
		sections.push(
			'## COMPOSITION',
			'Components with body content can nest other components inside them.',
			'Use layout components (stack, grid, card, tabs) to arrange content.',
			'',
			'Nesting example:',
			'{% card title="Dashboard" %}',
			'{% grid cols=3 %}',
			'{% stat label="Revenue" value="$1.2M" change="+12%" trend="up" /%}',
			'{% stat label="Users" value="8,432" change="+5%" trend="up" /%}',
			'{% stat label="Churn" value="3.1%" change="-0.5%" trend="down" /%}',
			'{% /grid %}',
			'{% chart type="bar" labels=["Q1","Q2","Q3","Q4"] values=[80,120,150,200] /%}',
			'{% /card %}',
			'',
			'Button groups:',
			'{% button action="continue" label="View details" /%}',
			'{% button action="continue" label="Export" variant="secondary" /%}',
			'',
			'Forms with inputs:',
			'{% form name="contact" %}',
			'{% input name="email" label="Email" type="email" /%}',
			'{% input name="message" label="Message" placeholder="Your message..." /%}',
			'{% button action="submit:contact" label="Send" /%}',
			'{% /form %}',
			'',
			'## STREAMING GUIDELINE',
			'Write prose content before components.',
			'Users see text immediately while components load.',
			'',
		)
	}

	if (options?.additionalRules && options.additionalRules.length > 0) {
		sections.push('## RULES')
		for (const rule of options.additionalRules) sections.push(`- ${rule}`)
		sections.push('')
	}

	if (options?.examples && options.examples.length > 0) {
		sections.push('## EXAMPLE', '')
		for (const example of options.examples) sections.push(example, '')
	}

	return sections.join('\n').trim()
}

// biome-ignore lint/suspicious/noExplicitAny: Zod internals require dynamic access
type ZodDef = Record<string, any>

interface ZodField {
	isOptional: () => boolean
	_def: ZodDef
}

function resolveType(def: ZodDef): string {
	const type = (def.type as string) ?? ''

	if (type === 'optional' || type === 'default') {
		return resolveType(def.innerType?._def ?? {})
	}

	if (type === 'nullable') {
		const inner = resolveType(def.innerType?._def ?? {})
		return inner ? `${inner} | null` : 'null'
	}

	// Unwrap preprocess/transform/pipe (e.g. ciEnum case-normalization, z.coerce.*)
	if (type === 'pipe') {
		const inner = def.out?._def
		if (inner) return resolveType(inner)
		return ''
	}
	if (type === 'effects') {
		const inner = def.innerType?._def ?? def.schema?._def
		if (inner) return resolveType(inner)
		return ''
	}

	if (type === 'enum') {
		const entries = def.entries as Record<string, string> | undefined
		if (entries)
			return Object.values(entries)
				.map((v) => `"${v}"`)
				.join(' | ')
		return 'enum'
	}

	if (type === 'array') {
		const inner = def.element?._def
		if (inner) return `${resolveType(inner)}[]`
		return 'array'
	}

	if (type === 'string') return 'string'
	if (type === 'number') return 'number'
	if (type === 'boolean') return 'boolean'

	return ''
}

function formatComponent(def: ComponentDefinition): string {
	const closing = def.children === 'none' ? ' /%}' : ' %}'
	const shape = def.props.shape as unknown as Record<string, ZodField>
	const propNames = Object.keys(shape)

	if (propNames.length === 0) {
		const lines = [`{% ${def.name}${closing}`, `  ${def.description}`]
		if (def.children && def.children !== 'none') {
			lines.push(formatChildren(def.children))
		}
		return lines.join('\n')
	}

	const sig = propNames.map((name) => (shape[name].isOptional() ? `${name}?` : name)).join(' ')
	const lines = [`{% ${def.name} ${sig}${closing}`, `  ${def.description}`]

	for (const [name, field] of Object.entries(shape)) {
		const desc = (field as { description?: string }).description ?? ''
		const typeStr = resolveType(field._def)
		const opt = field.isOptional() ? ' (optional)' : ''
		const typeHint = typeStr ? ` — ${typeStr}` : ''
		lines.push(`  ${name}${typeHint}: ${desc}${opt}`)
	}

	if (def.children && def.children !== 'none') {
		lines.push(formatChildren(def.children))
	}

	return lines.join('\n')
}

function formatComponentCompact(def: ComponentDefinition): string {
	const shape = def.props.shape as unknown as Record<string, ZodField>
	const props = Object.entries(shape)
		.map(([name, field]) => {
			const type = resolveType(field._def)
			const opt = field.isOptional() ? '?' : ''
			return `${name}${opt}${type ? `(${type})` : ''}`
		})
		.join(' ')

	const children =
		def.children === 'none' || !def.children
			? 'self-closing'
			: def.children === 'any'
				? 'body'
				: `children: ${(def.children as string[]).join(',')}`

	return `${def.name}: ${props} — ${children}`
}

function formatChildren(children: 'any' | string[] | undefined): string {
	if (!children || children === 'any') return '  (accepts any body content)'
	return `  (children: ${children.join(', ')})`
}
