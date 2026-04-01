import { z } from 'zod'
import { defineComponent } from './registry'

// ── Layout ──────────────────────────────────────────────

export const stack = defineComponent({
	name: 'stack',
	description: 'Vertical or horizontal flex container',
	props: z.object({
		direction: z.enum(['vertical', 'horizontal']).optional().describe('Stack direction'),
		gap: z.enum(['none', 'sm', 'md', 'lg']).optional().describe('Spacing between children'),
		align: z
			.enum(['start', 'center', 'end', 'stretch'])
			.optional()
			.describe('Cross-axis alignment'),
	}),
	children: 'any',
})

export const grid = defineComponent({
	name: 'grid',
	description: 'CSS grid layout with configurable columns',
	props: z.object({
		cols: z.number().optional().describe('Number of columns'),
		gap: z.enum(['none', 'sm', 'md', 'lg']).optional().describe('Grid gap'),
	}),
	children: 'any',
})

export const card = defineComponent({
	name: 'card',
	description: 'Bordered content container with optional title',
	props: z.object({
		title: z.string().optional().describe('Card heading'),
		variant: z.enum(['default', 'outlined', 'elevated']).optional().describe('Card style'),
	}),
	children: 'any',
})

export const divider = defineComponent({
	name: 'divider',
	description: 'Horizontal separator line',
	props: z.object({}),
	children: 'none',
})

export const accordion = defineComponent({
	name: 'accordion',
	description: 'Collapsible content section',
	props: z.object({
		title: z.string().describe('Accordion header text'),
		open: z.boolean().optional().describe('Whether expanded by default'),
	}),
	children: 'any',
})

export const tabs = defineComponent({
	name: 'tabs',
	description: 'Tabbed content container — each child tab has a label',
	props: z.object({
		labels: z.array(z.coerce.string()).describe('Tab labels in order'),
		active: z.number().optional().describe('Zero-based index of active tab'),
	}),
	children: ['tab'],
})

export const tab = defineComponent({
	name: 'tab',
	description: 'Single tab panel inside a tabs container',
	props: z.object({
		label: z.string().describe('Tab label'),
	}),
	children: 'any',
})

// ── Interactive ─────────────────────────────────────────

export const button = defineComponent({
	name: 'button',
	description: 'Clickable action button',
	props: z.object({
		action: z.string().describe('Action identifier — "continue" sends label as new message'),
		label: z.string().describe('Button text'),
		variant: z
			.enum(['primary', 'secondary', 'outline', 'ghost'])
			.optional()
			.describe('Visual style'),
		disabled: z.boolean().optional().describe('Whether button is disabled'),
	}),
	children: 'none',
})

export const buttonGroup = defineComponent({
	name: 'button-group',
	description: 'Row of related buttons',
	props: z.object({
		direction: z.enum(['horizontal', 'vertical']).optional().describe('Layout direction'),
	}),
	children: ['button'],
})

export const input = defineComponent({
	name: 'input',
	description: 'Text input field',
	props: z.object({
		name: z.string().describe('Field name for form state'),
		label: z.string().optional().describe('Input label'),
		placeholder: z.string().optional().describe('Placeholder text'),
		type: z.enum(['text', 'email', 'password', 'number', 'url']).optional().describe('Input type'),
		required: z.boolean().optional().describe('Whether field is required'),
	}),
	children: 'none',
})

export const select = defineComponent({
	name: 'select',
	description: 'Dropdown select menu',
	props: z.object({
		name: z.string().describe('Field name for form state'),
		label: z.string().optional().describe('Select label'),
		options: z.array(z.coerce.string()).describe('List of option values'),
		placeholder: z.string().optional().describe('Placeholder text'),
		required: z.boolean().optional().describe('Whether selection is required'),
	}),
	children: 'none',
})

export const checkbox = defineComponent({
	name: 'checkbox',
	description: 'Toggle checkbox',
	props: z.object({
		name: z.string().describe('Field name for form state'),
		label: z.string().describe('Checkbox label text'),
		checked: z.boolean().optional().describe('Default checked state'),
	}),
	children: 'none',
})

export const textarea = defineComponent({
	name: 'textarea',
	description: 'Multi-line text input',
	props: z.object({
		name: z.string().describe('Field name for form state'),
		label: z.string().optional().describe('Textarea label'),
		placeholder: z.string().optional().describe('Placeholder text'),
		rows: z.number().optional().describe('Number of visible rows'),
		required: z.boolean().optional().describe('Whether field is required'),
	}),
	children: 'none',
})

export const toggle = defineComponent({
	name: 'toggle',
	description: 'On/off toggle switch',
	props: z.object({
		name: z.string().describe('Field name for form state'),
		label: z.string().describe('Toggle label'),
		checked: z.boolean().optional().describe('Default on/off state'),
	}),
	children: 'none',
})

export const form = defineComponent({
	name: 'form',
	description: 'Form container that groups inputs and submits their state',
	props: z.object({
		name: z.string().describe('Form identifier for action events'),
		action: z.string().optional().describe('Submit action — defaults to "submit:<name>"'),
	}),
	children: ['input', 'textarea', 'select', 'checkbox', 'toggle', 'button'],
})

// ── Data ────────────────────────────────────────────────

export const chart = defineComponent({
	name: 'chart',
	description: 'Data visualization',
	props: z.object({
		type: z.enum(['bar', 'line', 'pie', 'donut']).describe('Chart type'),
		labels: z.array(z.coerce.string()).describe('Category labels'),
		values: z.array(z.coerce.number()).describe('Data values'),
		title: z.string().optional().describe('Chart title'),
	}),
	children: 'none',
})

export const table = defineComponent({
	name: 'table',
	description: 'Data table with headers and rows',
	props: z.object({
		headers: z.array(z.coerce.string()).describe('Column header labels'),
		rows: z.array(z.array(z.coerce.string())).describe('Row data as string arrays'),
		caption: z.string().optional().describe('Table caption'),
	}),
	children: 'none',
})

export const stat = defineComponent({
	name: 'stat',
	description: 'Key metric display with label and value',
	props: z.object({
		label: z.string().describe('Metric name'),
		value: z.string().describe('Metric value'),
		change: z.string().optional().describe('Change indicator like "+12%" or "-3%"'),
		trend: z
			.preprocess(
				(v) => (typeof v === 'string' && (v.toLowerCase() === 'flat' || v.toLowerCase() === 'stable') ? 'neutral' : typeof v === 'string' ? v.toLowerCase() : v),
				z.enum(['up', 'down', 'neutral']),
			)
			.optional()
			.describe('Trend direction'),
	}),
	children: 'none',
})

export const progress = defineComponent({
	name: 'progress',
	description: 'Progress bar',
	props: z.object({
		value: z.number().describe('Current value (0-100)'),
		label: z.string().optional().describe('Progress label'),
		max: z.number().optional().describe('Maximum value — defaults to 100'),
	}),
	children: 'none',
})

// ── Content ─────────────────────────────────────────────

export const callout = defineComponent({
	name: 'callout',
	description: 'Highlighted message block for alerts and notices',
	props: z.object({
		type: z.enum(['info', 'warning', 'error', 'success']).describe('Callout severity'),
		title: z.string().optional().describe('Callout heading'),
	}),
	children: 'any',
})

export const badge = defineComponent({
	name: 'badge',
	description: 'Inline label or tag',
	props: z.object({
		label: z.string().describe('Badge text'),
		variant: z
			.enum(['default', 'success', 'warning', 'error', 'info'])
			.optional()
			.describe('Color variant'),
	}),
	children: 'none',
})

export const image = defineComponent({
	name: 'image',
	description: 'Inline image',
	props: z.object({
		src: z.string().describe('Image URL'),
		alt: z.string().describe('Alt text for accessibility'),
		width: z.number().optional().describe('Width in pixels'),
		height: z.number().optional().describe('Height in pixels'),
	}),
	children: 'none',
})

export const codeBlock = defineComponent({
	name: 'code-block',
	description: 'Syntax-highlighted code block',
	props: z.object({
		language: z.string().optional().describe('Programming language'),
		title: z.string().optional().describe('Code block title or filename'),
		code: z.string().describe('The source code'),
	}),
	children: 'none',
})

export const link = defineComponent({
	name: 'link',
	description: 'Clickable link that triggers an action or opens a URL',
	props: z.object({
		action: z.string().describe('Action identifier — "open_url" opens params.url'),
		label: z.string().describe('Link text'),
		url: z.string().optional().describe('Target URL when action is "open_url"'),
	}),
	children: 'none',
})

// ── All definitions ─────────────────────────────────────

export const allDefinitions = [
	stack,
	grid,
	card,
	divider,
	accordion,
	tabs,
	tab,
	button,
	buttonGroup,
	input,
	textarea,
	select,
	checkbox,
	toggle,
	form,
	chart,
	table,
	stat,
	progress,
	callout,
	badge,
	image,
	codeBlock,
	link,
]

export const defaultGroups = [
	{
		name: 'Layout',
		components: ['stack', 'grid', 'card', 'divider', 'accordion', 'tabs', 'tab'],
		notes: ['Use stack for vertical/horizontal layouts', 'Nest tabs with tab children'],
	},
	{
		name: 'Interactive',
		components: [
			'button',
			'button-group',
			'input',
			'textarea',
			'select',
			'checkbox',
			'toggle',
			'form',
		],
		notes: [
			'Wrap inputs in a form for state collection',
			'button action="continue" sends label as message',
		],
	},
	{
		name: 'Data',
		components: ['chart', 'table', 'stat', 'progress'],
	},
	{
		name: 'Content',
		components: ['callout', 'badge', 'image', 'code-block', 'link'],
	},
]
