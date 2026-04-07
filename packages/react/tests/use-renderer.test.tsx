import { allDefinitions, ComponentRegistry } from '@mdocui/core'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useRenderer } from '../src/use-renderer'

function createRegistry() {
	const registry = new ComponentRegistry()
	registry.registerAll(allDefinitions)
	return registry
}

describe('useRenderer', () => {
	describe('push', () => {
		it('sets isStreaming=true on first push', async () => {
			const { result } = renderHook(() => useRenderer({ registry: createRegistry() }))

			await act(async () => {
				result.current.push('Hello world')
			})

			expect(result.current.isStreaming).toBe(true)
		})

		it('updates nodes after push via RAF', async () => {
			const { result } = renderHook(() => useRenderer({ registry: createRegistry() }))

			await act(async () => {
				result.current.push('Hello world')
			})

			expect(result.current.nodes.length).toBeGreaterThan(0)
		})

		it('done() flushes final state and clears isStreaming', async () => {
			const { result } = renderHook(() => useRenderer({ registry: createRegistry() }))

			await act(async () => {
				result.current.push('Hello {% stat label="Rev" value="$1M" /%}')
			})

			await act(async () => {
				result.current.done()
			})

			expect(result.current.isStreaming).toBe(false)
			expect(result.current.meta.isComplete).toBe(true)
			expect(result.current.nodes.length).toBeGreaterThan(0)
		})

		it('renders latest state when multiple pushes arrive in same frame', async () => {
			const { result } = renderHook(() => useRenderer({ registry: createRegistry() }))

			await act(async () => {
				result.current.push('Hello ')
				result.current.push('**world**')
				result.current.push(' how are you')
			})

			expect(result.current.nodes.length).toBeGreaterThan(0)
			const prose = result.current.nodes.find((n) => n.type === 'prose')
			// all three chunks must be present — verifies coalescing read latest parser state
			expect(prose?.content).toContain('Hello')
			expect(prose?.content).toContain('how are you')
		})
	})

	describe('replaceContent', () => {
		it('defaults to non-streaming (flush + isStreaming=false)', () => {
			const { result } = renderHook(() => useRenderer({ registry: createRegistry() }))

			act(() => {
				result.current.replaceContent('Hello {% stat label="Rev" value="$1M" /%}')
			})

			expect(result.current.isStreaming).toBe(false)
			expect(result.current.meta.isComplete).toBe(true)
			expect(result.current.nodes.length).toBeGreaterThan(0)
		})

		it('keeps isStreaming=true when streaming option is set', () => {
			const { result } = renderHook(() => useRenderer({ registry: createRegistry() }))

			act(() => {
				result.current.replaceContent('Hello {% stat label="Rev"', { streaming: true })
			})

			expect(result.current.isStreaming).toBe(true)
			expect(result.current.meta.pendingTag).toBe('stat')
		})

		it('sets pendingTag during streaming replaceContent for shimmer', () => {
			const { result } = renderHook(() => useRenderer({ registry: createRegistry() }))

			act(() => {
				result.current.replaceContent('Some text\n{% chart type="bar" labels=["A","B"]', {
					streaming: true,
				})
			})

			expect(result.current.isStreaming).toBe(true)
			expect(result.current.meta.pendingTag).toBe('chart')
			expect(result.current.meta.isComplete).toBe(false)
		})

		it('resolves after done() is called', () => {
			const { result } = renderHook(() => useRenderer({ registry: createRegistry() }))

			act(() => {
				result.current.replaceContent('Hello {% stat label="Rev" value="$1M" /%}', {
					streaming: true,
				})
			})

			expect(result.current.isStreaming).toBe(true)

			act(() => {
				result.current.done()
			})

			expect(result.current.isStreaming).toBe(false)
			expect(result.current.meta.isComplete).toBe(true)
		})

		it('reset() clears stuck streaming state', () => {
			const { result } = renderHook(() => useRenderer({ registry: createRegistry() }))

			act(() => {
				result.current.replaceContent('{% chart', { streaming: true })
			})

			expect(result.current.isStreaming).toBe(true)

			act(() => {
				result.current.reset()
			})

			expect(result.current.isStreaming).toBe(false)
			expect(result.current.nodes).toHaveLength(0)
		})

		it('supports multiple replaceContent calls with streaming (AG-UI pattern)', () => {
			const { result } = renderHook(() => useRenderer({ registry: createRegistry() }))

			// Simulate AG-UI deltas with accumulated content
			act(() => {
				result.current.replaceContent('Hello', { streaming: true })
			})
			expect(result.current.isStreaming).toBe(true)

			act(() => {
				result.current.replaceContent('Hello {% stat label="Rev"', { streaming: true })
			})
			expect(result.current.meta.pendingTag).toBe('stat')

			act(() => {
				result.current.replaceContent('Hello {% stat label="Rev" value="$1M" /%}', {
					streaming: true,
				})
			})
			// Tag is complete now but still streaming
			expect(result.current.isStreaming).toBe(true)

			act(() => {
				result.current.done()
			})
			expect(result.current.isStreaming).toBe(false)
			expect(result.current.nodes.some((n) => n.type === 'prose')).toBe(true)
			expect(result.current.nodes.some((n) => n.type === 'component' && n.name === 'stat')).toBe(
				true,
			)
		})
	})
})
