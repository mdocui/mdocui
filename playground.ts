/**
 * Quick playground to test @mdocui/core interactively.
 * Run: npx tsx playground.ts
 */
import { z } from 'zod'
import {
	ComponentRegistry,
	StreamingParser,
	defineComponent,
	generatePrompt,
} from './packages/core/src/index'

// 1. Define components
const button = defineComponent({
	name: 'button',
	description: 'Clickable action button',
	props: z.object({
		action: z.string().describe('Action to perform — "continue" sends label as message'),
		label: z.string().describe('Button text'),
		variant: z.enum(['primary', 'secondary']).optional().describe('Visual style'),
	}),
	children: 'none',
})

const chart = defineComponent({
	name: 'chart',
	description: 'Data visualization',
	props: z.object({
		type: z.enum(['bar', 'line', 'pie']).describe('Chart type'),
		labels: z.array(z.string()).describe('X-axis labels'),
		values: z.array(z.number()).describe('Data values'),
		title: z.string().optional().describe('Chart title'),
	}),
	children: 'none',
})

const callout = defineComponent({
	name: 'callout',
	description: 'Highlighted message block',
	props: z.object({
		type: z.enum(['info', 'warning', 'error']).describe('Callout severity'),
		title: z.string().optional().describe('Optional heading'),
	}),
	children: 'any',
})

// 2. Create registry
const registry = new ComponentRegistry()
registry.registerAll([button, chart, callout])

// 3. Generate system prompt
console.log('=== GENERATED SYSTEM PROMPT ===\n')
const prompt = generatePrompt(registry, {
	preamble: 'You are a helpful financial analyst assistant.',
	groups: [
		{ name: 'Interactive', components: ['button'] },
		{ name: 'Data', components: ['chart'] },
		{ name: 'Layout', components: ['callout'] },
	],
	additionalRules: ['Always end responses with 2-3 follow-up buttons'],
})
console.log(prompt)

// 4. Simulate streaming parse — as if an LLM is sending chunks
console.log('\n\n=== STREAMING PARSE SIMULATION ===\n')

const parser = new StreamingParser({ knownTags: registry.knownTags() })

// Simulate token-by-token chunks from an LLM
const chunks = [
	'The Q4 results show ',
	'strong growth across all segments.\n\n',
	'{% chart type="bar" labels=["Jan","Feb","Mar"] values=[120,150,180] title="Q1 Revenue" /%}',
	'\n\nRevenue grew **12%** quarter-over-quarter.\n\n',
	'{% callout type="info" title="Action Required" %}',
	'\nReview pipeline before end of quarter.',
	'\n{% /callout %}\n\n',
	'Want to dig deeper?\n\n',
	'{% button action="continue" label="Show by region" /%}\n',
	'{% button action="continue" label="Export as PDF" /%}',
]

for (const chunk of chunks) {
	const nodes = parser.write(chunk)
	if (nodes.length > 0) {
		for (const node of nodes) {
			if (node.type === 'prose') {
				console.log(
					`[PROSE] "${node.content.trim().slice(0, 60)}${node.content.length > 60 ? '...' : ''}"`,
				)
			} else {
				console.log(`[COMPONENT] <${node.name}> props=${JSON.stringify(node.props)}`)
				if (node.children.length > 0) {
					console.log(`  children: ${node.children.length} node(s)`)
				}
			}
		}
	}
}

// Flush remaining
const remaining = parser.flush()
for (const node of remaining) {
	console.log(`[FLUSH] ${node.type === 'prose' ? 'prose' : node.name}`)
}

// 5. Show metadata
const meta = parser.getMeta()
console.log(`\n=== PARSE META ===`)
console.log(`Nodes: ${meta.nodeCount}`)
console.log(`Complete: ${meta.isComplete}`)
console.log(`Errors: ${meta.errors.length}`)
if (meta.errors.length > 0) {
	for (const err of meta.errors) {
		console.log(`  [${err.code}] ${err.message}`)
	}
}

// 6. Validate props
console.log('\n=== VALIDATION ===')
console.log('Valid button:', registry.validate('button', { action: 'continue', label: 'Go' }))
console.log('Invalid button:', registry.validate('button', { action: 123 }))
console.log('Unknown tag:', registry.validate('slider', {}))
