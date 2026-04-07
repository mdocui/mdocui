import type { ASTNode } from '@mdocui/core'
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import type { ComponentProps } from '../src/context'
import { MdocUIErrorBoundary } from '../src/error-boundary'
import { Renderer } from '../src/renderer'

function ThrowingComponent(): never {
	throw new Error('Component exploded')
}

function GoodComponent() {
	return <span>Works fine</span>
}

describe('MdocUIErrorBoundary', () => {
	let consoleSpy: MockInstance

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		consoleSpy.mockRestore()
	})

	it('renders children when no error occurs', () => {
		const { container } = render(
			<MdocUIErrorBoundary componentName="test">
				<GoodComponent />
			</MdocUIErrorBoundary>,
		)
		expect(container.textContent).toContain('Works fine')
	})

	it('renders fallback with component name when child throws', () => {
		const { container } = render(
			<MdocUIErrorBoundary componentName="chart">
				<ThrowingComponent />
			</MdocUIErrorBoundary>,
		)
		expect(container.textContent).toContain('Component "chart" failed to render.')
	})

	it('renders generic fallback when componentName is not provided', () => {
		const { container } = render(
			<MdocUIErrorBoundary>
				<ThrowingComponent />
			</MdocUIErrorBoundary>,
		)
		expect(container.textContent).toContain('A component failed to render.')
	})

	it('renders data-mdocui-error attribute on fallback', () => {
		const { container } = render(
			<MdocUIErrorBoundary componentName="table">
				<ThrowingComponent />
			</MdocUIErrorBoundary>,
		)
		expect(container.querySelector('[data-mdocui-error]')).toBeTruthy()
	})

	it('logs error with component name to console', () => {
		render(
			<MdocUIErrorBoundary componentName="stat">
				<ThrowingComponent />
			</MdocUIErrorBoundary>,
		)
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining('[mdocui] Component <stat>'),
			expect.any(Error),
			expect.any(String),
		)
	})

	it('resets when resetKey changes', () => {
		const { container, rerender } = render(
			<MdocUIErrorBoundary componentName="widget" resetKey="key-1">
				<ThrowingComponent />
			</MdocUIErrorBoundary>,
		)
		expect(container.textContent).toContain('Component "widget" failed to render.')

		rerender(
			<MdocUIErrorBoundary componentName="widget" resetKey="key-2">
				<GoodComponent />
			</MdocUIErrorBoundary>,
		)
		expect(container.textContent).toContain('Works fine')
		expect(container.querySelector('[data-mdocui-error]')).toBeNull()
	})

	it('stays in error state when resetKey does not change', () => {
		const { container, rerender } = render(
			<MdocUIErrorBoundary componentName="widget" resetKey="key-1">
				<ThrowingComponent />
			</MdocUIErrorBoundary>,
		)
		expect(container.textContent).toContain('Component "widget" failed to render.')

		rerender(
			<MdocUIErrorBoundary componentName="widget" resetKey="key-1">
				<GoodComponent />
			</MdocUIErrorBoundary>,
		)
		expect(container.textContent).toContain('Component "widget" failed to render.')
	})

	it('shows last valid children when component throws after a successful render', () => {
		const { container, rerender } = render(
			<MdocUIErrorBoundary componentName="chart">
				<GoodComponent />
			</MdocUIErrorBoundary>,
		)
		expect(container.textContent).toContain('Works fine')

		rerender(
			<MdocUIErrorBoundary componentName="chart">
				<ThrowingComponent />
			</MdocUIErrorBoundary>,
		)
		// Last valid output shown — no error fallback
		expect(container.textContent).toContain('Works fine')
		expect(container.querySelector('[data-mdocui-error]')).toBeNull()
	})

	it('recovers to new children after resetKey changes following a last-valid state', () => {
		const { container, rerender } = render(
			<MdocUIErrorBoundary componentName="chart" resetKey="k1">
				<GoodComponent />
			</MdocUIErrorBoundary>,
		)

		rerender(
			<MdocUIErrorBoundary componentName="chart" resetKey="k1">
				<ThrowingComponent />
			</MdocUIErrorBoundary>,
		)
		expect(container.textContent).toContain('Works fine') // last valid shown

		rerender(
			<MdocUIErrorBoundary componentName="chart" resetKey="k2">
				<span>New content</span>
			</MdocUIErrorBoundary>,
		)
		expect(container.textContent).toContain('New content')
		expect(container.querySelector('[data-mdocui-error]')).toBeNull()
	})

	it('shows last valid children when component throws again after a resetKey reset', () => {
		const { container, rerender } = render(
			<MdocUIErrorBoundary componentName="chart" resetKey="k1">
				<GoodComponent />
			</MdocUIErrorBoundary>,
		)
		rerender(
			<MdocUIErrorBoundary componentName="chart" resetKey="k1">
				<ThrowingComponent />
			</MdocUIErrorBoundary>,
		)
		expect(container.textContent).toContain('Works fine')

		rerender(
			<MdocUIErrorBoundary componentName="chart" resetKey="k2">
				<GoodComponent />
			</MdocUIErrorBoundary>,
		)
		expect(container.textContent).toContain('Works fine')

		// After reset, the successful reset render is captured as last-valid.
		// A subsequent throw shows that snapshot, not the error fallback.
		rerender(
			<MdocUIErrorBoundary componentName="chart" resetKey="k2">
				<ThrowingComponent />
			</MdocUIErrorBoundary>,
		)
		expect(container.textContent).toContain('Works fine')
		expect(container.querySelector('[data-mdocui-error]')).toBeNull()
	})

	it('stays in error state when resetKey is undefined throughout', () => {
		const { container, rerender } = render(
			<MdocUIErrorBoundary componentName="widget">
				<ThrowingComponent />
			</MdocUIErrorBoundary>,
		)
		expect(container.textContent).toContain('Component "widget" failed to render.')

		rerender(
			<MdocUIErrorBoundary componentName="widget">
				<GoodComponent />
			</MdocUIErrorBoundary>,
		)
		expect(container.textContent).toContain('Component "widget" failed to render.')
	})
})

describe('Error boundary in Renderer', () => {
	let consoleSpy: MockInstance

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		consoleSpy.mockRestore()
	})

	it('one broken component does not crash others', () => {
		function BrokenChart(): never {
			throw new Error('Chart crashed')
		}

		const nodes: ASTNode[] = [
			{ type: 'prose', content: 'Before' },
			{
				type: 'component',
				name: 'chart',
				props: { type: 'bar', labels: ['A'], values: [10] },
				children: [],
				selfClosing: true,
			},
			{
				type: 'component',
				name: 'badge',
				props: { label: 'OK' },
				children: [],
				selfClosing: true,
			},
			{ type: 'prose', content: 'After' },
		]

		const { container } = render(
			<Renderer
				nodes={nodes}
				components={{ chart: BrokenChart as unknown as React.ComponentType<ComponentProps> }}
			/>,
		)

		expect(container.textContent).toContain('Before')
		expect(container.textContent).toContain('After')
		expect(container.textContent).toContain('OK')
		expect(container.querySelector('[data-mdocui-error]')).toBeTruthy()
		expect(container.textContent).toContain('Component "chart" failed to render.')
	})
})
