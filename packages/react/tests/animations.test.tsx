import { render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AnimateIn } from '../src/animations'

afterEach(() => {
	// Clean up injected style tags between tests
	const style = document.getElementById('mdocui-animate-keyframes')
	if (style) style.remove()
})

describe('AnimateIn', () => {
	it('returns children unwrapped when not streaming', () => {
		const { container } = render(
			<AnimateIn isStreaming={false}>
				<span>Content</span>
			</AnimateIn>,
		)
		expect(container.querySelector('[data-mdocui-animate]')).toBeNull()
		expect(container.querySelector('span')?.textContent).toBe('Content')
	})

	it('wraps children in animated div when streaming', () => {
		const { container } = render(
			<AnimateIn isStreaming={true}>
				<span>Streaming content</span>
			</AnimateIn>,
		)
		const wrapper = container.querySelector('[data-mdocui-animate]')
		expect(wrapper).toBeTruthy()
		expect(wrapper?.querySelector('span')?.textContent).toBe('Streaming content')
	})

	it('applies animation style when streaming', () => {
		const { container } = render(
			<AnimateIn isStreaming={true}>
				<span>Animated</span>
			</AnimateIn>,
		)
		const wrapper = container.querySelector('[data-mdocui-animate]') as HTMLElement
		expect(wrapper.style.animation).toContain('mdocui-fade-in')
		expect(wrapper.style.animation).toContain('200ms')
	})

	it('removes wrapper when streaming ends', () => {
		const { container, rerender } = render(
			<AnimateIn isStreaming={true}>
				<span>Content</span>
			</AnimateIn>,
		)
		expect(container.querySelector('[data-mdocui-animate]')).toBeTruthy()

		rerender(
			<AnimateIn isStreaming={false}>
				<span>Content</span>
			</AnimateIn>,
		)
		expect(container.querySelector('[data-mdocui-animate]')).toBeNull()
	})

	it('preserves children content across streaming state changes', () => {
		const { container, rerender } = render(
			<AnimateIn isStreaming={true}>
				<span>Hello</span>
			</AnimateIn>,
		)
		expect(container.querySelector('span')?.textContent).toBe('Hello')

		rerender(
			<AnimateIn isStreaming={false}>
				<span>Hello</span>
			</AnimateIn>,
		)
		expect(container.querySelector('span')?.textContent).toBe('Hello')
	})
})
