import { describe, expect, it } from 'vitest'
import { parseAttributes } from '../src/attributes'

describe('parseAttributes', () => {
	it('parses quoted string', () => {
		expect(parseAttributes('label="Click me"')).toEqual({ label: 'Click me' })
	})

	it('parses single-quoted string', () => {
		expect(parseAttributes("label='Click me'")).toEqual({ label: 'Click me' })
	})

	it('parses number', () => {
		expect(parseAttributes('count=42')).toEqual({ count: 42 })
	})

	it('parses boolean true', () => {
		expect(parseAttributes('disabled=true')).toEqual({ disabled: true })
	})

	it('parses boolean false', () => {
		expect(parseAttributes('disabled=false')).toEqual({ disabled: false })
	})

	it('parses boolean flag (no value)', () => {
		expect(parseAttributes('disabled')).toEqual({ disabled: true })
	})

	it('parses JSON array of strings', () => {
		expect(parseAttributes('labels=["Jan","Feb","Mar"]')).toEqual({
			labels: ['Jan', 'Feb', 'Mar'],
		})
	})

	it('parses JSON array of numbers', () => {
		expect(parseAttributes('values=[1,2,3]')).toEqual({ values: [1, 2, 3] })
	})

	it('parses multiple attributes', () => {
		expect(parseAttributes('action="continue" label="Go" variant="primary"')).toEqual({
			action: 'continue',
			label: 'Go',
			variant: 'primary',
		})
	})

	it('parses mixed types', () => {
		expect(parseAttributes('type="bar" labels=["a","b"] values=[1,2] title="Chart"')).toEqual({
			type: 'bar',
			labels: ['a', 'b'],
			values: [1, 2],
			title: 'Chart',
		})
	})

	it('handles escaped quotes in strings', () => {
		expect(parseAttributes('label="say \\"hello\\""')).toEqual({ label: 'say "hello"' })
	})

	it('handles null value', () => {
		expect(parseAttributes('value=null')).toEqual({ value: null })
	})

	it('handles empty input', () => {
		expect(parseAttributes('')).toEqual({})
	})

	it('rejects __proto__ key', () => {
		const result = parseAttributes('__proto__="polluted" label="safe"')
		expect(result).toEqual({ label: 'safe' })
		expect(Object.getPrototypeOf(result)).toBeNull()
	})

	it('rejects constructor key', () => {
		const result = parseAttributes('constructor="bad" ok=true')
		expect(result).toEqual({ ok: true })
	})

	it('handles escaped quotes inside array strings', () => {
		const result = parseAttributes('items=["a\\"b","c"]')
		expect(result.items).toEqual(['a"b', 'c'])
	})

	it('handles value=0 correctly', () => {
		expect(parseAttributes('offset=0')).toEqual({ offset: 0 })
	})
})
