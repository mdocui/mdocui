import type { ASTNode, ActionEvent } from '@mdocui/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
