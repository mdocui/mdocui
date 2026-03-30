import type { ASTNode, ParseMeta } from '@mdocui/core'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Renderer } from '../src/renderer'
import { ComponentShimmer } from '../src/shimmer'

describe('ComponentShimmer', () => {
	it('renders shimmer bars', () => {
		const { container } = render(<ComponentShimmer />)
		expect(container.querySelector('[data-mdocui-shimmer]')).toBeTruthy()
	})

	it('includes pending tag name as data attribute', () => {
		const { container } = render(<ComponentShimmer pendingTag="chart" />)
		const el = container.querySelector('[data-mdocui-shimmer]') as HTMLElement
		expect(el.getAttribute('data-pending-tag')).toBe('chart')
	})

	it('renders without pending tag', () => {
		const { container } = render(<ComponentShimmer />)
		const el = container.querySelector('[data-mdocui-shimmer]') as HTMLElement
		expect(el.getAttribute('data-pending-tag')).toBeNull()
	})
})

describe('Renderer shimmer integration', () => {
	const proseNode: ASTNode = { type: 'prose', content: 'Loading data...' }

	it('shows shimmer when streaming with pending tag', () => {
		const meta: ParseMeta = {
			errors: [],
			nodeCount: 1,
			isComplete: false,
			pendingTag: 'chart',
			bufferLength: 25,
		}
		const { container } = render(<Renderer nodes={[proseNode]} isStreaming={true} meta={meta} />)
		expect(container.querySelector('[data-mdocui-shimmer]')).toBeTruthy()
		expect(
			(container.querySelector('[data-mdocui-shimmer]') as HTMLElement).getAttribute(
				'data-pending-tag',
			),
		).toBe('chart')
	})

	it('does not show shimmer when not streaming', () => {
		const meta: ParseMeta = {
			errors: [],
			nodeCount: 1,
			isComplete: true,
		}
		const { container } = render(<Renderer nodes={[proseNode]} isStreaming={false} meta={meta} />)
		expect(container.querySelector('[data-mdocui-shimmer]')).toBeNull()
	})

	it('does not show shimmer when no pending tag', () => {
		const meta: ParseMeta = {
			errors: [],
			nodeCount: 1,
			isComplete: false,
		}
		const { container } = render(<Renderer nodes={[proseNode]} isStreaming={true} meta={meta} />)
		expect(container.querySelector('[data-mdocui-shimmer]')).toBeNull()
	})

	it('uses custom renderPendingComponent', () => {
		const meta: ParseMeta = {
			errors: [],
			nodeCount: 1,
			isComplete: false,
			pendingTag: 'table',
		}
		const { container } = render(
			<Renderer
				nodes={[proseNode]}
				isStreaming={true}
				meta={meta}
				renderPendingComponent={(tag) => <div data-testid="custom-shimmer">{tag}</div>}
			/>,
		)
		expect(container.querySelector('[data-testid="custom-shimmer"]')).toBeTruthy()
		expect(container.querySelector('[data-testid="custom-shimmer"]')?.textContent).toBe('table')
		expect(container.querySelector('[data-mdocui-shimmer]')).toBeNull()
	})

	it('hides shimmer when renderPendingComponent is null', () => {
		const meta: ParseMeta = {
			errors: [],
			nodeCount: 1,
			isComplete: false,
			pendingTag: 'chart',
		}
		const { container } = render(
			<Renderer nodes={[proseNode]} isStreaming={true} meta={meta} renderPendingComponent={null} />,
		)
		expect(container.querySelector('[data-mdocui-shimmer]')).toBeNull()
	})
})
