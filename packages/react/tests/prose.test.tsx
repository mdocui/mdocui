import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SimpleMarkdown } from '../src/prose'

describe('SimpleMarkdown', () => {
	describe('bold rendering', () => {
		it('renders **text** as <strong>', () => {
			const { container } = render(<SimpleMarkdown content="Hello **world**" dataKey="t1" />)
			const strong = container.querySelector('strong')
			expect(strong).toBeTruthy()
			expect(strong?.textContent).toBe('world')
		})

		it('renders __text__ as <strong>', () => {
			const { container } = render(<SimpleMarkdown content="Hello __world__" dataKey="t2" />)
			const strong = container.querySelector('strong')
			expect(strong).toBeTruthy()
			expect(strong?.textContent).toBe('world')
		})
	})

	describe('italic rendering', () => {
		it('renders *text* as <em>', () => {
			const { container } = render(<SimpleMarkdown content="Hello *world*" dataKey="t3" />)
			const em = container.querySelector('em')
			expect(em).toBeTruthy()
			expect(em?.textContent).toBe('world')
		})

		it('renders _text_ as <em>', () => {
			const { container } = render(<SimpleMarkdown content="Hello _world_" dataKey="t4" />)
			const em = container.querySelector('em')
			expect(em).toBeTruthy()
			expect(em?.textContent).toBe('world')
		})
	})

	describe('inline code', () => {
		it('renders `code` as <code>', () => {
			const { container } = render(<SimpleMarkdown content="Use `npm install`" dataKey="t5" />)
			const code = container.querySelector('code')
			expect(code).toBeTruthy()
			expect(code?.textContent).toBe('npm install')
		})
	})

	describe('links', () => {
		it('renders [text](url) as <a>', () => {
			const { container } = render(
				<SimpleMarkdown content="Visit [Google](https://google.com)" dataKey="t6" />,
			)
			const link = container.querySelector('a')
			expect(link).toBeTruthy()
			expect(link?.textContent).toBe('Google')
			expect(link?.getAttribute('href')).toBe('https://google.com')
			expect(link?.getAttribute('target')).toBe('_blank')
			expect(link?.getAttribute('rel')).toBe('noopener noreferrer')
		})
	})

	describe('headings', () => {
		it('renders # as h1', () => {
			const { container } = render(<SimpleMarkdown content="# Title" dataKey="t7" />)
			const h1 = container.querySelector('h1')
			expect(h1).toBeTruthy()
			expect(h1?.textContent).toBe('Title')
		})

		it('renders ## as h2', () => {
			const { container } = render(<SimpleMarkdown content="## Subtitle" dataKey="t8" />)
			const h2 = container.querySelector('h2')
			expect(h2).toBeTruthy()
			expect(h2?.textContent).toBe('Subtitle')
		})

		it('renders ### as h3', () => {
			const { container } = render(<SimpleMarkdown content="### Section" dataKey="t9" />)
			const h3 = container.querySelector('h3')
			expect(h3).toBeTruthy()
			expect(h3?.textContent).toBe('Section')
		})
	})

	describe('unordered lists', () => {
		it('renders - items as <ul><li>', () => {
			const { container } = render(
				<SimpleMarkdown content={'- Alpha\n- Beta\n- Gamma'} dataKey="t10" />,
			)
			const ul = container.querySelector('ul')
			expect(ul).toBeTruthy()
			const items = container.querySelectorAll('li')
			expect(items.length).toBe(3)
			expect(items[0].textContent).toBe('Alpha')
			expect(items[1].textContent).toBe('Beta')
			expect(items[2].textContent).toBe('Gamma')
		})
	})

	describe('paragraph breaks', () => {
		it('renders double newline as separate paragraphs', () => {
			const { container } = render(
				<SimpleMarkdown content={'First paragraph\n\nSecond paragraph'} dataKey="t11" />,
			)
			const paragraphs = container.querySelectorAll('p')
			expect(paragraphs.length).toBe(2)
			expect(paragraphs[0].textContent).toBe('First paragraph')
			expect(paragraphs[1].textContent).toBe('Second paragraph')
		})
	})

	describe('mixed inline formatting', () => {
		it('renders bold, italic, and code in the same line', () => {
			const { container } = render(
				<SimpleMarkdown content="Use **bold** and *italic* with `code`" dataKey="t12" />,
			)
			expect(container.querySelector('strong')?.textContent).toBe('bold')
			expect(container.querySelector('em')?.textContent).toBe('italic')
			expect(container.querySelector('code')?.textContent).toBe('code')
		})
	})

	describe('plain text passthrough', () => {
		it('renders plain text without any formatting elements', () => {
			render(<SimpleMarkdown content="Just plain text" dataKey="t13" />)
			expect(screen.getByText('Just plain text')).toBeDefined()
		})

		it('wraps plain text in a paragraph', () => {
			const { container } = render(<SimpleMarkdown content="Plain text" dataKey="t14" />)
			const p = container.querySelector('p')
			expect(p).toBeTruthy()
			expect(p?.textContent).toBe('Plain text')
		})
	})

	describe('empty content', () => {
		it('renders a span with data-mdocui-prose for empty string', () => {
			const { container } = render(<SimpleMarkdown content="" dataKey="t15" />)
			const span = container.querySelector('span[data-mdocui-prose]')
			expect(span).toBeTruthy()
		})

		it('renders a span with data-mdocui-prose for whitespace-only', () => {
			const { container } = render(<SimpleMarkdown content="   " dataKey="t16" />)
			const span = container.querySelector('span[data-mdocui-prose]')
			expect(span).toBeTruthy()
		})
	})
})
