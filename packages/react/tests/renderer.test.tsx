import type { ActionEvent, ASTNode } from '@mdocui/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from '../src/context'
import { defaultComponents } from '../src/defaults'
import { Renderer } from '../src/renderer'

describe('Renderer', () => {
	it('renders prose nodes as text', () => {
		const nodes: ASTNode[] = [{ type: 'prose', content: 'Hello world' }]
		render(<Renderer nodes={nodes} components={defaultComponents} />)
		expect(screen.getByText('Hello world')).toBeDefined()
	})

	it('renders a button component', () => {
		const nodes: ASTNode[] = [
			{
				type: 'component',
				name: 'button',
				props: { action: 'continue', label: 'Click me' },
				children: [],
				selfClosing: true,
			},
		]
		render(<Renderer nodes={nodes} components={defaultComponents} />)
		expect(screen.getByText('Click me')).toBeDefined()
	})

	it('fires onAction when button is clicked', () => {
		const handler = vi.fn()
		const nodes: ASTNode[] = [
			{
				type: 'component',
				name: 'button',
				props: { action: 'continue', label: 'Go' },
				children: [],
				selfClosing: true,
			},
		]
		render(<Renderer nodes={nodes} components={defaultComponents} onAction={handler} />)
		fireEvent.click(screen.getByText('Go'))

		expect(handler).toHaveBeenCalledOnce()
		const event: ActionEvent = handler.mock.calls[0][0]
		expect(event.type).toBe('button_click')
		expect(event.action).toBe('continue')
		expect(event.label).toBe('Go')
	})

	it('disables buttons during streaming', () => {
		const handler = vi.fn()
		const nodes: ASTNode[] = [
			{
				type: 'component',
				name: 'button',
				props: { action: 'go', label: 'Click' },
				children: [],
				selfClosing: true,
			},
		]
		render(<Renderer nodes={nodes} components={defaultComponents} onAction={handler} isStreaming />)
		fireEvent.click(screen.getByText('Click'))
		expect(handler).not.toHaveBeenCalled()
	})

	it('renders callout with children', () => {
		const nodes: ASTNode[] = [
			{
				type: 'component',
				name: 'callout',
				props: { type: 'info', title: 'Note' },
				children: [{ type: 'prose', content: 'Important info here' }],
				selfClosing: false,
			},
		]
		render(<Renderer nodes={nodes} components={defaultComponents} />)
		expect(screen.getByText('Note')).toBeDefined()
		expect(screen.getByText('Important info here')).toBeDefined()
	})

	it('renders a table with data', () => {
		const nodes: ASTNode[] = [
			{
				type: 'component',
				name: 'table',
				props: {
					headers: ['Name', 'Value'],
					rows: [
						['Alpha', '100'],
						['Beta', '200'],
					],
				},
				children: [],
				selfClosing: true,
			},
		]
		render(<Renderer nodes={nodes} components={defaultComponents} />)
		expect(screen.getByText('Name')).toBeDefined()
		expect(screen.getByText('Alpha')).toBeDefined()
		expect(screen.getByText('200')).toBeDefined()
	})

	it('renders a stat component', () => {
		const nodes: ASTNode[] = [
			{
				type: 'component',
				name: 'stat',
				props: { label: 'Revenue', value: '$1.2M', change: '+12%', trend: 'up' },
				children: [],
				selfClosing: true,
			},
		]
		render(<Renderer nodes={nodes} components={defaultComponents} />)
		expect(screen.getByText('Revenue')).toBeDefined()
		expect(screen.getByText('$1.2M')).toBeDefined()
		expect(screen.getByText('+12%')).toBeDefined()
	})

	it('renders card with title and body', () => {
		const nodes: ASTNode[] = [
			{
				type: 'component',
				name: 'card',
				props: { title: 'Summary' },
				children: [{ type: 'prose', content: 'Card content' }],
				selfClosing: false,
			},
		]
		render(<Renderer nodes={nodes} components={defaultComponents} />)
		expect(screen.getByText('Summary')).toBeDefined()
		expect(screen.getByText('Card content')).toBeDefined()
	})

	it('renders mixed prose and components', () => {
		const nodes: ASTNode[] = [
			{ type: 'prose', content: 'Here are the results:' },
			{
				type: 'component',
				name: 'chart',
				props: { type: 'bar', labels: ['A', 'B'], values: [10, 20] },
				children: [],
				selfClosing: true,
			},
			{ type: 'prose', content: 'What next?' },
			{
				type: 'component',
				name: 'button',
				props: { action: 'continue', label: 'More details' },
				children: [],
				selfClosing: true,
			},
		]
		render(<Renderer nodes={nodes} components={defaultComponents} />)
		expect(screen.getByText('Here are the results:')).toBeDefined()
		expect(screen.getByText('What next?')).toBeDefined()
		expect(screen.getByText('More details')).toBeDefined()
	})

	it('skips unknown component names gracefully', () => {
		const nodes: ASTNode[] = [
			{
				type: 'component',
				name: 'nonexistent',
				props: {},
				children: [],
				selfClosing: true,
			},
			{ type: 'prose', content: 'Still renders' },
		]
		render(<Renderer nodes={nodes} components={defaultComponents} />)
		expect(screen.getByText('Still renders')).toBeDefined()
	})

	it('supports custom renderProse', () => {
		const nodes: ASTNode[] = [{ type: 'prose', content: '**bold**' }]
		render(
			<Renderer
				nodes={nodes}
				components={defaultComponents}
				renderProse={(content, key) => <em key={key}>{content}</em>}
			/>,
		)
		expect(screen.getByText('**bold**').tagName).toBe('EM')
	})
})

describe('Component merging', () => {
	it('uses all defaults when no custom components are passed', () => {
		const nodes: ASTNode[] = [
			{
				type: 'component',
				name: 'button',
				props: { action: 'go', label: 'Default Button' },
				children: [],
				selfClosing: true,
			},
			{
				type: 'component',
				name: 'badge',
				props: { label: 'Status' },
				children: [],
				selfClosing: true,
			},
		]
		render(<Renderer nodes={nodes} />)
		expect(screen.getByText('Default Button')).toBeDefined()
		expect(screen.getByText('Status')).toBeDefined()
	})

	it('overrides one default component while keeping others', () => {
		function CustomButton({ props }: ComponentProps) {
			return <span data-testid="custom-button">{String(props.label)}-custom</span>
		}

		const nodes: ASTNode[] = [
			{
				type: 'component',
				name: 'button',
				props: { action: 'go', label: 'Click' },
				children: [],
				selfClosing: true,
			},
			{
				type: 'component',
				name: 'badge',
				props: { label: 'Info' },
				children: [],
				selfClosing: true,
			},
		]
		render(<Renderer nodes={nodes} components={{ button: CustomButton }} />)

		// Custom button component is used
		expect(screen.getByTestId('custom-button')).toBeDefined()
		expect(screen.getByText('Click-custom')).toBeDefined()

		// Default badge component still works
		expect(screen.getByText('Info')).toBeDefined()
	})
})

describe('Child key uniqueness', () => {
	it('generates unique keys for children of same-type siblings', () => {
		const nodes: ASTNode[] = [
			{
				type: 'component',
				name: 'grid',
				props: { cols: 2 },
				children: [
					{
						type: 'component',
						name: 'card',
						props: { title: 'Card A' },
						children: [
							{ type: 'component', name: 'stat', props: { label: 'Revenue', value: '$1M' }, children: [], selfClosing: true },
							{ type: 'component', name: 'chart', props: { type: 'bar', labels: ['A'], values: [1] }, children: [], selfClosing: true },
						],
						selfClosing: false,
					},
					{
						type: 'component',
						name: 'card',
						props: { title: 'Card B' },
						children: [
							{ type: 'component', name: 'chart', props: { type: 'bar', labels: ['B'], values: [2] }, children: [], selfClosing: true },
							{ type: 'component', name: 'stat', props: { label: 'Orders', value: '500' }, children: [], selfClosing: true },
						],
						selfClosing: false,
					},
				],
				selfClosing: false,
			},
		]
		// Should render without React key warnings
		const { container } = render(<Renderer nodes={nodes} components={defaultComponents} />)
		expect(container.querySelectorAll('[data-mdocui-card]').length).toBe(2)
		expect(container.querySelectorAll('[data-mdocui-stat]').length).toBe(2)
		expect(container.querySelectorAll('[data-mdocui-chart]').length).toBe(2)
	})

	it('generates unique keys for mixed prose and component children', () => {
		const nodes: ASTNode[] = [
			{
				type: 'component',
				name: 'card',
				props: { title: 'Mixed' },
				children: [
					{ type: 'prose', content: 'Intro text' },
					{ type: 'component', name: 'stat', props: { label: 'X', value: '1' }, children: [], selfClosing: true },
					{ type: 'prose', content: 'Middle text' },
					{ type: 'component', name: 'stat', props: { label: 'Y', value: '2' }, children: [], selfClosing: true },
				],
				selfClosing: false,
			},
		]
		const { container } = render(<Renderer nodes={nodes} components={defaultComponents} />)
		expect(container.querySelectorAll('[data-mdocui-stat]').length).toBe(2)
		expect(screen.getByText('Intro text')).toBeDefined()
		expect(screen.getByText('Middle text')).toBeDefined()
	})
})

describe('Default prose rendering', () => {
	it('uses SimpleMarkdown when no renderProse is provided', () => {
		const nodes: ASTNode[] = [{ type: 'prose', content: 'Hello **bold** world' }]
		const { container } = render(<Renderer nodes={nodes} />)

		// SimpleMarkdown wraps content in [data-mdocui-prose]
		expect(container.querySelector('[data-mdocui-prose]')).toBeTruthy()
		// Bold text is rendered as <strong>
		const strong = container.querySelector('strong')
		expect(strong).toBeTruthy()
		expect(strong?.textContent).toBe('bold')
	})

	it('renderProse override replaces SimpleMarkdown completely', () => {
		const nodes: ASTNode[] = [{ type: 'prose', content: 'Hello **bold** world' }]
		const { container } = render(
			<Renderer
				nodes={nodes}
				renderProse={(content, key) => (
					<div key={key} data-testid="custom-prose">
						{content}
					</div>
				)}
			/>,
		)

		// Custom renderProse is used instead of SimpleMarkdown
		expect(screen.getByTestId('custom-prose')).toBeDefined()
		// Raw markdown is passed through, not parsed
		expect(screen.getByText('Hello **bold** world')).toBeDefined()
		// SimpleMarkdown's data attribute is not present
		expect(container.querySelector('[data-mdocui-prose]')).toBeNull()
	})
})
