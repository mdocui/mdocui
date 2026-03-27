import type { ComponentRegistry } from './registry'
import type { ComponentDefinition, PromptOptions } from './types'

export function generatePrompt(registry: ComponentRegistry, options?: PromptOptions): string {
	const sections: string[] = []

	if (options?.preamble) {
		sections.push(options.preamble, '')
	}

	sections.push(
		'You respond in mdocUI format.',
		'',
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

	const defs = registry.all()
	if (defs.length > 0) {
		sections.push('## COMPONENTS', '')

		if (options?.groups && options.groups.length > 0) {
			const grouped = new Set<string>()

			for (const group of options.groups) {
				sections.push(`### ${group.name}`)
				if (group.notes) {
					for (const note of group.notes) sections.push(`> ${note}`)
				}
				sections.push('')
				for (const name of group.components) {
					const def = registry.get(name)
					if (def) {
						sections.push(formatComponent(def), '')
						grouped.add(name)
					}
				}
			}

			for (const def of defs) {
				if (!grouped.has(def.name)) sections.push(formatComponent(def), '')
			}
		} else {
			for (const def of defs) sections.push(formatComponent(def), '')
		}
	}

	sections.push(
		'## STREAMING GUIDELINE',
		'Write prose content before components.',
		'Users see text immediately while components load.',
		'',
	)

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

interface ZodField {
	isOptional: () => boolean
	_def: { description?: string }
}

function formatComponent(def: ComponentDefinition): string {
	const closing = def.children === 'none' ? ' /%}' : ' %}'
	const shape = def.props.shape as Record<string, ZodField>
	const propNames = Object.keys(shape)

	const sig = propNames.map((name) => (shape[name].isOptional() ? `${name}?` : name)).join(' ')

	const lines = [`{% ${def.name} ${sig}${closing}`, `  ${def.description}`]

	for (const [name, field] of Object.entries(shape)) {
		const desc = field._def.description ?? ''
		const opt = field.isOptional() ? ' (optional)' : ''
		lines.push(`  ${name}: ${desc}${opt}`)
	}

	if (def.children && def.children !== 'none') {
		lines.push('  (accepts body content)')
	}

	return lines.join('\n')
}
