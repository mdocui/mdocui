import type { ActionEvent, ASTNode } from '@mdocui/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { defaultComponents } from '../src/defaults'
import { Renderer } from '../src/renderer'

function renderNodes(nodes: ASTNode[], onAction = vi.fn(), isStreaming = false) {
	return render(
		<Renderer
			nodes={nodes}
			components={defaultComponents}
			onAction={onAction}
			isStreaming={isStreaming}
		/>,
	)
}

function componentNode(
	name: string,
	props: Record<string, unknown>,
	children: ASTNode[] = [],
): ASTNode {
	return { type: 'component', name, props, children, selfClosing: children.length === 0 }
}

describe('Layout components', () => {
	it('renders stack with children', () => {
		renderNodes([
			componentNode('stack', { direction: 'horizontal', gap: 'lg' }, [
				{ type: 'prose', content: 'Item 1' },
				{ type: 'prose', content: 'Item 2' },
			]),
		])
		expect(screen.getByText('Item 1')).toBeDefined()
		expect(screen.getByText('Item 2')).toBeDefined()
	})

	it('renders grid', () => {
		renderNodes([componentNode('grid', { cols: 3 }, [{ type: 'prose', content: 'Cell' }])])
		expect(screen.getByText('Cell')).toBeDefined()
	})

	it('renders card with title', () => {
		renderNodes([
			componentNode('card', { title: 'My Card', variant: 'elevated' }, [
				{ type: 'prose', content: 'Card body' },
			]),
		])
		expect(screen.getByText('My Card')).toBeDefined()
		expect(screen.getByText('Card body')).toBeDefined()
	})

	it('renders card without title', () => {
		renderNodes([componentNode('card', {}, [{ type: 'prose', content: 'No title' }])])
		expect(screen.getByText('No title')).toBeDefined()
	})

	it('renders divider', () => {
		const { container } = renderNodes([componentNode('divider', {})])
		expect(container.querySelector('hr[data-mdocui-divider]')).toBeTruthy()
	})

	it('renders accordion', () => {
		renderNodes([
			componentNode('accordion', { title: 'Details', open: true }, [
				{ type: 'prose', content: 'Hidden content' },
			]),
		])
		expect(screen.getByText('Details')).toBeDefined()
		expect(screen.getByText('Hidden content')).toBeDefined()
	})

	it('renders tabs with labels', () => {
		renderNodes([
			componentNode('tabs', { labels: ['Tab A', 'Tab B'], active: 1 }, [
				componentNode('tab', { label: 'Tab A' }, [{ type: 'prose', content: 'Content A' }]),
				componentNode('tab', { label: 'Tab B' }, [{ type: 'prose', content: 'Content B' }]),
			]),
		])
		expect(screen.getByText('Tab A')).toBeDefined()
		expect(screen.getByText('Tab B')).toBeDefined()
		const tabB = screen.getByText('Tab B')
		expect(tabB.getAttribute('aria-selected')).toBe('true')
	})

	it('switches tabs on click', () => {
		renderNodes([
			componentNode('tabs', { labels: ['First', 'Second'], active: 0 }, [
				componentNode('tab', { label: 'First' }, [{ type: 'prose', content: 'Panel 1' }]),
				componentNode('tab', { label: 'Second' }, [{ type: 'prose', content: 'Panel 2' }]),
			]),
		])
		expect(screen.getByText('Panel 1')).toBeDefined()
		expect(screen.queryByText('Panel 2')).toBeNull()

		fireEvent.click(screen.getByText('Second'))
		expect(screen.queryByText('Panel 1')).toBeNull()
		expect(screen.getByText('Panel 2')).toBeDefined()
	})
})

describe('Interactive components', () => {
	it('renders button variants', () => {
		renderNodes([
			componentNode('button', { action: 'go', label: 'Primary', variant: 'primary' }),
			componentNode('button', { action: 'go', label: 'Ghost', variant: 'ghost' }),
			componentNode('button', { action: 'go', label: 'Outline', variant: 'outline' }),
		])
		expect(screen.getByText('Primary')).toBeDefined()
		expect(screen.getByText('Ghost')).toBeDefined()
		expect(screen.getByText('Outline')).toBeDefined()
	})

	it('renders disabled button', () => {
		const handler = vi.fn()
		renderNodes(
			[componentNode('button', { action: 'go', label: 'Disabled', disabled: true })],
			handler,
		)
		fireEvent.click(screen.getByText('Disabled'))
		expect(handler).not.toHaveBeenCalled()
	})

	it('forwards extra props as params on button_click', () => {
		const handler = vi.fn()
		renderNodes(
			[
				componentNode('button', {
					action: 'open_article',
					label: 'View',
					url: '/a/1',
					articleId: 'a1',
				}),
			],
			handler,
		)
		fireEvent.click(screen.getByText('View'))
		expect(handler).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'button_click',
				action: 'open_article',
				label: 'View',
				params: { url: '/a/1', articleId: 'a1' },
			}),
		)
	})

	it('omits params on button_click when no extra props', () => {
		const handler = vi.fn()
		renderNodes([componentNode('button', { action: 'go', label: 'Go' })], handler)
		fireEvent.click(screen.getByText('Go'))
		const event = handler.mock.calls[0][0]
		expect(event.params).toBeUndefined()
	})

	it('renders button-group', () => {
		renderNodes([
			componentNode('button-group', { direction: 'horizontal' }, [
				componentNode('button', { action: 'a', label: 'Btn 1' }),
				componentNode('button', { action: 'b', label: 'Btn 2' }),
			]),
		])
		expect(screen.getByText('Btn 1')).toBeDefined()
		expect(screen.getByText('Btn 2')).toBeDefined()
	})

	it('renders input with label', () => {
		renderNodes([
			componentNode('input', {
				name: 'email',
				label: 'Email',
				type: 'email',
				placeholder: 'you@example.com',
			}),
		])
		expect(screen.getByText('Email')).toBeDefined()
		const input = screen.getByPlaceholderText('you@example.com')
		expect(input.getAttribute('type')).toBe('email')
	})

	it('renders select with options', () => {
		renderNodes([
			componentNode('select', {
				name: 'color',
				label: 'Color',
				options: ['Red', 'Green', 'Blue'],
				placeholder: 'Pick one',
			}),
		])
		expect(screen.getByText('Color')).toBeDefined()
		expect(screen.getByText('Pick one')).toBeDefined()
		expect(screen.getByText('Red')).toBeDefined()
	})

	it('fires select_change on select change', () => {
		const handler = vi.fn()
		const { container } = renderNodes(
			[
				componentNode('select', {
					name: 'fruit',
					options: ['Apple', 'Banana'],
					placeholder: 'Pick',
				}),
			],
			handler,
		)
		const selectEl = container.querySelector('select') as HTMLSelectElement
		fireEvent.change(selectEl, { target: { value: 'Banana' } })
		expect(handler).toHaveBeenCalledOnce()
		const event: ActionEvent = handler.mock.calls[0][0]
		expect(event.type).toBe('select_change')
		expect(event.params?.value).toBe('Banana')
	})

	it('renders checkbox', () => {
		renderNodes([componentNode('checkbox', { name: 'agree', label: 'I agree', checked: true })])
		expect(screen.getByText('I agree')).toBeDefined()
	})

	it('fires select_change event when checkbox is toggled', () => {
		const handler = vi.fn()
		const { container } = renderNodes(
			[componentNode('checkbox', { name: 'terms', label: 'Accept terms' })],
			handler,
		)
		const cb = container.querySelector('input[type="checkbox"]') as HTMLInputElement
		fireEvent.click(cb)
		expect(cb.checked).toBe(true)
		expect(handler).toHaveBeenCalledOnce()
		const event: ActionEvent = handler.mock.calls[0][0]
		expect(event.type).toBe('select_change')
		expect(event.params?.value).toBe(true)
	})

	it('handles form submission', () => {
		const handler = vi.fn()
		renderNodes(
			[
				componentNode('form', { name: 'contact' }, [
					componentNode('input', { name: 'username', placeholder: 'Name' }),
					componentNode('button', { action: 'submit:contact', label: 'Submit' }),
				]),
			],
			handler,
		)

		const input = screen.getByPlaceholderText('Name')
		fireEvent.change(input, { target: { value: 'John' } })
		fireEvent.submit(input.closest('form') as HTMLFormElement)

		expect(handler).toHaveBeenCalledOnce()
		const event: ActionEvent = handler.mock.calls[0][0]
		expect(event.type).toBe('form_submit')
		expect(event.formName).toBe('contact')
		expect(event.formState).toHaveProperty('username')
	})

	it('blocks form submit during streaming', () => {
		const handler = vi.fn()
		renderNodes(
			[
				componentNode('form', { name: 'f' }, [
					componentNode('input', { name: 'x', placeholder: 'X' }),
				]),
			],
			handler,
			true,
		)
		const input = screen.getByPlaceholderText('X')
		fireEvent.submit(input.closest('form') as HTMLFormElement)
		expect(handler).not.toHaveBeenCalled()
	})
})

describe('Data components', () => {
	it('renders bar chart with labels', () => {
		const { container } = renderNodes([
			componentNode('chart', {
				type: 'bar',
				labels: ['Q1', 'Q2', 'Q3'],
				values: [100, 200, 150],
				title: 'Quarterly Revenue',
			}),
		])
		expect(screen.getByText('Quarterly Revenue')).toBeDefined()
		expect(screen.getByText('Q1')).toBeDefined()
		expect(container.querySelector('[data-mdocui-chart]')).toBeTruthy()
	})

	it('renders pie chart', () => {
		renderNodes([
			componentNode('chart', {
				type: 'pie',
				labels: ['Desktop', 'Mobile'],
				values: [60, 40],
			}),
		])
		expect(screen.getByText(/Desktop/)).toBeDefined()
		expect(screen.getByText(/Mobile/)).toBeDefined()
	})

	it('renders table with caption', () => {
		renderNodes([
			componentNode('table', {
				headers: ['Product', 'Sales'],
				rows: [
					['Widget', '500'],
					['Gadget', '300'],
				],
				caption: 'Top Products',
			}),
		])
		expect(screen.getByText('Top Products')).toBeDefined()
		expect(screen.getByText('Widget')).toBeDefined()
	})

	it('renders stat with trend', () => {
		renderNodes([
			componentNode('stat', { label: 'MRR', value: '$50K', change: '+8%', trend: 'up' }),
		])
		expect(screen.getByText('MRR')).toBeDefined()
		expect(screen.getByText('$50K')).toBeDefined()
		expect(screen.getByText('+8%')).toBeDefined()
	})

	it('renders progress bar', () => {
		const { container } = renderNodes([
			componentNode('progress', { value: 75, label: 'Upload', max: 100 }),
		])
		expect(screen.getByText('Upload')).toBeDefined()
		expect(container.querySelector('[data-mdocui-progress]')).toBeTruthy()
	})
})

describe('Content components', () => {
	it('renders callout variants', () => {
		for (const type of ['info', 'warning', 'error', 'success']) {
			const { unmount } = renderNodes([
				componentNode('callout', { type, title: `${type} alert` }, [
					{ type: 'prose', content: `${type} message` },
				]),
			])
			expect(screen.getByText(`${type} alert`)).toBeDefined()
			expect(screen.getByText(`${type} message`)).toBeDefined()
			unmount()
		}
	})

	it('renders badge', () => {
		renderNodes([componentNode('badge', { label: 'New', variant: 'success' })])
		expect(screen.getByText('New')).toBeDefined()
	})

	it('renders image', () => {
		const { container } = renderNodes([
			componentNode('image', { src: '/test.png', alt: 'Test image', width: 200 }),
		])
		const img = container.querySelector('img[data-mdocui-image]')
		expect(img).toBeTruthy()
		expect(img?.getAttribute('alt')).toBe('Test image')
		expect(img?.getAttribute('src')).toBe('/test.png')
	})

	it('renders code-block with title', () => {
		renderNodes([
			componentNode('code-block', {
				code: 'const x = 1',
				language: 'typescript',
				title: 'example.ts',
			}),
		])
		expect(screen.getByText('example.ts')).toBeDefined()
		expect(screen.getByText('const x = 1')).toBeDefined()
	})

	it('renders link and fires action on click', () => {
		const handler = vi.fn()
		renderNodes(
			[
				componentNode('link', {
					action: 'open_url',
					label: 'Visit site',
					url: 'https://example.com',
				}),
			],
			handler,
		)
		fireEvent.click(screen.getByText('Visit site'))
		expect(handler).toHaveBeenCalledOnce()
		const event: ActionEvent = handler.mock.calls[0][0]
		expect(event.type).toBe('link_click')
		expect(event.action).toBe('open_url')
		expect(event.params?.url).toBe('https://example.com')
	})

	it('link does not fire during streaming', () => {
		const handler = vi.fn()
		renderNodes(
			[componentNode('link', { action: 'open_url', label: 'Link', url: 'https://example.com' })],
			handler,
			true,
		)
		fireEvent.click(screen.getByText('Link'))
		expect(handler).not.toHaveBeenCalled()
	})
})
