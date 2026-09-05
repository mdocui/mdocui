import { describe, expect, it } from 'vitest'
import { parseBlocks, parseInline, sanitizeHref } from '../src/prose'

describe('sanitizeHref', () => {
	it('allows safe schemes and relative forms', () => {
		for (const href of [
			'https://example.com',
			'http://example.com',
			'mailto:a@b.com',
			'tel:+123',
			'/about',
			'#anchor',
			'?q=1',
		]) {
			expect(sanitizeHref(href)).toBe(href)
		}
	})

	it('rejects script-bearing and protocol-relative urls', () => {
		for (const href of [
			'javascript:alert(1)',
			'JavaScript:alert(1)',
			'  javascript:alert(1)  ',
			'data:text/html,<script>alert(1)</script>',
			'vbscript:msgbox(1)',
			'//evil.com',
			'file:///etc/passwd',
		]) {
			expect(sanitizeHref(href)).toBeUndefined()
		}
	})

	it('returns undefined for missing input', () => {
		expect(sanitizeHref(undefined)).toBeUndefined()
		expect(sanitizeHref('')).toBeUndefined()
	})

	it('trims surrounding whitespace on accepted urls', () => {
		expect(sanitizeHref('  https://example.com  ')).toBe('https://example.com')
	})
})

describe('parseInline', () => {
	it('splits the inline formats', () => {
		const tokens = parseInline('a **b** _c_ ***d*** ~~e~~ `f` [g](https://h.com)')
		expect(tokens.map((t) => t.type)).toEqual([
			'text',
			'bold',
			'text',
			'italic',
			'text',
			'bolditalic',
			'text',
			'strikethrough',
			'text',
			'code',
			'text',
			'link',
		])
	})

	it('keeps the raw href on link tokens for the renderer to sanitize', () => {
		const [link] = parseInline('[x](javascript:alert(1))').filter((t) => t.type === 'link')
		expect(link).toBeDefined()
		expect(sanitizeHref(link.href)).toBeUndefined()
	})

	it('returns a single text token when there is no markup', () => {
		expect(parseInline('plain text')).toEqual([{ type: 'text', content: 'plain text' }])
	})

	it('returns nothing for an empty string', () => {
		expect(parseInline('')).toEqual([])
	})
})

describe('parseBlocks', () => {
	it('reads headings at levels one to three', () => {
		const blocks = parseBlocks('# a\n\n## b\n\n### c')
		expect(blocks.map((b) => b.level)).toEqual([1, 2, 3])
		expect(blocks.every((b) => b.type === 'heading')).toBe(true)
	})

	it('does not treat four hashes as a heading', () => {
		const [block] = parseBlocks('#### not a heading')
		expect(block.type).toBe('paragraph')
	})

	it('groups consecutive list items and ends the list on other content', () => {
		const blocks = parseBlocks('- one\n- two\n\nafter')
		expect(blocks[0]).toEqual({ type: 'ulist', items: ['one', 'two'] })
		expect(blocks[1].type).toBe('paragraph')
	})

	it('reads ordered lists with either separator', () => {
		expect(parseBlocks('1. a\n2) b')[0]).toEqual({ type: 'olist', items: ['a', 'b'] })
	})

	it('splits paragraphs on blank lines', () => {
		const blocks = parseBlocks('one\n\ntwo')
		expect(blocks.map((b) => b.content)).toEqual(['one', 'two'])
	})

	it('returns nothing for empty or whitespace-only content', () => {
		expect(parseBlocks('')).toEqual([])
		expect(parseBlocks('   \n\n  ')).toEqual([])
	})
})
