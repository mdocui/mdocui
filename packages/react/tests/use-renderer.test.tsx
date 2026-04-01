import { ComponentRegistry, allDefinitions } from '@mdocui/core'
import { renderHook, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useRenderer } from '../src/use-renderer'

function createRegistry() {
	const registry = new ComponentRegistry()
	registry.registerAll(allDefinitions)
	return registry
}

describe('useRenderer', () => {
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
				result.current.replaceContent(
					'Hello {% stat label="Rev"',
					{ streaming: true },
				)
			})

			expect(result.current.isStreaming).toBe(true)
			expect(result.current.meta.pendingTag).toBe('stat')
		})

		it('sets pendingTag during streaming replaceContent for shimmer', () => {
			const { result } = renderHook(() => useRenderer({ registry: createRegistry() }))

			act(() => {
				result.current.replaceContent(
					'Some text\n{% chart type="bar" labels=["A","B"]',
					{ streaming: true },
				)
			})

			expect(result.current.isStreaming).toBe(true)
			expect(result.current.meta.pendingTag).toBe('chart')
			expect(result.current.meta.isComplete).toBe(false)
		})

		it('resolves after done() is called', () => {
			const { result } = renderHook(() => useRenderer({ registry: createRegistry() }))

			act(() => {
				result.current.replaceContent(
					'Hello {% stat label="Rev" value="$1M" /%}',
					{ streaming: true },
				)
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
				result.current.replaceContent(
					'Hello {% stat label="Rev" value="$1M" /%}',
					{ streaming: true },
				)
			})
			// Tag is complete now but still streaming
			expect(result.current.isStreaming).toBe(true)

			act(() => {
				result.current.done()
			})
			expect(result.current.isStreaming).toBe(false)
			expect(result.current.nodes.length).toBe(2) // prose + stat
		})
	})
})
