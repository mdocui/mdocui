import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SimpleMarkdown } from '../src/prose'

describe('SimpleMarkdown', () => {
	describe('bold rendering', () => {
		it('renders **text** as <strong>', () => {
			const { container } = render(<SimpleMarkdown content="Hello **world**" dataKey="t1" />)
			const strong = container.querySelector('strong')
			expect(strong).not.toBeNull()
			expect(strong?.textContent).toBe('world')
		})

		it('renders __text__ as <strong>', () => {
			const { container } = render(<SimpleMarkdown content="Hello __world__" dataKey="t2" />)
			const strong = container.querySelector('strong')
			expect(strong).not.toBeNull()
			expect(strong?.textContent).toBe('world')
		})
	})

	describe('italic rendering', () => {
		it('renders *text* as <em>', () => {
			const { container } = render(<SimpleMarkdown content="Hello *world*" dataKey="t3" />)
			const em = container.querySelector('em')
			expect(em).not.toBeNull()
			expect(em?.textContent).toBe('world')
		})

		it('renders _text_ as <em>', () => {
			const { container } = render(<SimpleMarkdown content="Hello _world_" dataKey="t4" />)
			const em = container.querySelector('em')
			expect(em).not.toBeNull()
			expect(em?.textContent).toBe('world')
		})
	})

	describe('bold+italic rendering', () => {
		it('renders ***text*** as <strong><em>', () => {
			const { container } = render(<SimpleMarkdown content="Hello ***world***" dataKey="bi1" />)
			const strong = container.querySelector('strong')
			const em = strong?.querySelector('em')
			expect(strong).not.toBeNull()
			expect(em).not.toBeNull()
			expect(em?.parentElement).toBe(strong)
			expect(em?.textContent).toBe('world')
		})

		it('renders ___text___ as <strong><em>', () => {
			const { container } = render(<SimpleMarkdown content="Hello ___world___" dataKey="bi2" />)
			const strong = container.querySelector('strong')
			const em = strong?.querySelector('em')
			expect(strong).not.toBeNull()
			expect(em).not.toBeNull()
			expect(em?.parentElement).toBe(strong)
			expect(em?.textContent).toBe('world')
		})
	})

	describe('strikethrough rendering', () => {
		it('renders ~~text~~ as <del>', () => {
			const { container } = render(<SimpleMarkdown content="Hello ~~world~~" dataKey="s1" />)
			const del = container.querySelector('del')
			expect(del).toBeTruthy()
			expect(del?.textContent).toBe('world')
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

		it('blocks javascript: hrefs', () => {
			const { container } = render(
				<SimpleMarkdown content="[click](javascript:alert(1))" dataKey="t-xss1" />,
			)
			const link = container.querySelector('a')
			expect(link).toBeTruthy()
			expect(link?.getAttribute('href')).toBeNull()
		})

		it('blocks protocol-relative hrefs like //evil.com', () => {
			const { container } = render(
				<SimpleMarkdown content="[click](//evil.com)" dataKey="t-xss2" />,
			)
			const link = container.querySelector('a')
			expect(link).toBeTruthy()
			expect(link?.getAttribute('href')).toBeNull()
		})

		it('blocks data: URIs', () => {
			const { container } = render(
				<SimpleMarkdown
					content="[click](data:text/html,<script>alert(1)</script>)"
					dataKey="t-xss3"
				/>,
			)
			const link = container.querySelector('a')
			expect(link).toBeTruthy()
			expect(link?.getAttribute('href')).toBeNull()
		})

		it('blocks vbscript: hrefs', () => {
			const { container } = render(
				<SimpleMarkdown content="[click](vbscript:msgbox(1))" dataKey="t-xss4" />,
			)
			const link = container.querySelector('a')
			expect(link).toBeTruthy()
			expect(link?.getAttribute('href')).toBeNull()
		})

		it('allows relative paths and anchor hrefs', () => {
			const { container: c1 } = render(<SimpleMarkdown content="[page](/about)" dataKey="t-rel1" />)
			expect(c1.querySelector('a')?.getAttribute('href')).toBe('/about')

			const { container: c2 } = render(
				<SimpleMarkdown content="[section](#intro)" dataKey="t-rel2" />,
			)
			expect(c2.querySelector('a')?.getAttribute('href')).toBe('#intro')
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

		it('renders heading followed by content on single newline', () => {
			const { container } = render(
				<SimpleMarkdown
					content={'### Order Summary\n- **Item:** Shirt\n- **Price:** $25.99'}
					dataKey="h-fix"
				/>,
			)
			const h3 = container.querySelector('h3')
			expect(h3).toBeTruthy()
			expect(h3?.textContent).toBe('Order Summary')
			const items = container.querySelectorAll('li')
			expect(items.length).toBe(2)
		})

		it('renders heading between paragraphs without blank lines', () => {
			const { container } = render(
				<SimpleMarkdown content={'Some text\n## Heading\nMore text'} dataKey="h-mid" />,
			)
			const h2 = container.querySelector('h2')
			expect(h2).toBeTruthy()
			expect(h2?.textContent).toBe('Heading')
			const paragraphs = container.querySelectorAll('p')
			expect(paragraphs.length).toBe(2)
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

		it('renders * items as <ul><li>', () => {
			const { container } = render(
				<SimpleMarkdown content={'* First\n* Second'} dataKey="ul-star" />,
			)
			const ul = container.querySelector('ul')
			expect(ul).toBeTruthy()
			const items = container.querySelectorAll('li')
			expect(items.length).toBe(2)
		})

		it('renders list after paragraph with single newline', () => {
			const { container } = render(
				<SimpleMarkdown content={'Here are items:\n- One\n- Two\n- Three'} dataKey="ul-after" />,
			)
			const ul = container.querySelector('ul')
			expect(ul).toBeTruthy()
			const items = container.querySelectorAll('li')
			expect(items.length).toBe(3)
			const p = container.querySelector('p')
			expect(p?.textContent).toBe('Here are items:')
		})
	})

	describe('ordered lists', () => {
		it('renders 1. items as <ol><li>', () => {
			const { container } = render(
				<SimpleMarkdown content={'1. First\n2. Second\n3. Third'} dataKey="ol1" />,
			)
			const ol = container.querySelector('ol')
			expect(ol).toBeTruthy()
			const items = container.querySelectorAll('li')
			expect(items.length).toBe(3)
			expect(items[0].textContent).toBe('First')
			expect(items[1].textContent).toBe('Second')
			expect(items[2].textContent).toBe('Third')
		})

		it('renders 1) items as <ol><li>', () => {
			const { container } = render(<SimpleMarkdown content={'1) Alpha\n2) Beta'} dataKey="ol2" />)
			const ol = container.querySelector('ol')
			expect(ol).toBeTruthy()
			const items = container.querySelectorAll('li')
			expect(items.length).toBe(2)
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

	describe('mixed block types', () => {
		it('renders heading + list + paragraph without blank lines', () => {
			const content = '### Summary\n- Item A\n- Item B\nSome closing text.'
			const { container } = render(<SimpleMarkdown content={content} dataKey="mix1" />)
			expect(container.querySelector('h3')?.textContent).toBe('Summary')
			expect(container.querySelectorAll('li').length).toBe(2)
			expect(container.querySelector('p')?.textContent).toBe('Some closing text.')
		})

		it('renders multiple headings with content between them', () => {
			const content = '# Main\nIntro text\n## Section\n- Point 1\n- Point 2'
			const { container } = render(<SimpleMarkdown content={content} dataKey="mix2" />)
			expect(container.querySelector('h1')?.textContent).toBe('Main')
			expect(container.querySelector('h2')?.textContent).toBe('Section')
			expect(container.querySelectorAll('li').length).toBe(2)
		})
	})

	describe('plain text passthrough', () => {
		it('renders plain text without any formatting elements', () => {
			const { container } = render(<SimpleMarkdown content="Just plain text" dataKey="t13" />)
			const p = container.querySelector('p')
			expect(p).toBeTruthy()
			expect(p?.textContent).toBe('Just plain text')
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
