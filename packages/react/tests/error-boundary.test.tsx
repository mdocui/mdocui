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

	it('falls back to error fallback when the last-valid snapshot also throws', () => {
		// SometimesThrows succeeds once (captured as lastValid), then throws on remount.
		// The inner boundary should catch the re-throw and show the error fallback.
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		let mountCount = 0
		function SometimesThrows() {
			mountCount++
			if (mountCount > 1) throw new Error('re-throw on remount')
			return <span>Mounted once</span>
		}

		const { container, rerender } = render(
			<MdocUIErrorBoundary componentName="chart">
				<SometimesThrows />
			</MdocUIErrorBoundary>,
		)
		expect(container.textContent).toContain('Mounted once')

		// Now trigger an error — the boundary tries to show lastValidChildren
		// (the <SometimesThrows /> element).  On remount it throws again.
		// The inner LastValidAttemptBoundary must catch this and show the fallback.
		rerender(
			<MdocUIErrorBoundary componentName="chart">
				<ThrowingComponent />
			</MdocUIErrorBoundary>,
		)
		// Should show the error fallback, not loop or crash
		expect(container.querySelector('[data-mdocui-error]')).toBeTruthy()
		expect(container.textContent).toContain('Component "chart" failed to render.')
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('[mdocui] Last-valid snapshot also threw'),
			expect.any(Error),
		)
		warnSpy.mockRestore()
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

it('calls onError with componentName, error, and props when child throws', () => {
	const onError = vi.fn()
	render(
		<MdocUIErrorBoundary componentName="chart" onError={onError} componentProps={{ type: 'bar' }}>
			<ThrowingComponent />
		</MdocUIErrorBoundary>,
	)
	expect(onError).toHaveBeenCalledOnce()
	const event = onError.mock.calls[0][0]
	expect(event.componentName).toBe('chart')
	expect(event.error).toBeInstanceOf(Error)
	expect(event.props).toEqual({ type: 'bar' })
})

it('does not call onError when child renders successfully', () => {
	const onError = vi.fn()
	render(
		<MdocUIErrorBoundary componentName="chart" onError={onError}>
			<GoodComponent />
		</MdocUIErrorBoundary>,
	)
	expect(onError).not.toHaveBeenCalled()
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
