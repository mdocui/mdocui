import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ComponentRegistry, defineComponent } from '../src/registry'
import { table, chart, tabs, select } from '../src/definitions'

const buttonDef = defineComponent({
	name: 'button',
	description: 'Clickable action button',
	props: z.object({
		action: z.string().describe('Action to perform'),
		label: z.string().describe('Button text'),
		variant: z.enum(['primary', 'secondary']).optional().describe('Visual style'),
	}),
	children: 'none',
})

const calloutDef = defineComponent({
	name: 'callout',
	description: 'Highlighted message block',
	props: z.object({
		type: z.enum(['info', 'warning', 'error']).describe('Callout severity'),
		title: z.string().optional().describe('Optional title'),
	}),
	children: 'any',
})

describe('ComponentRegistry', () => {
	it('registers and retrieves components', () => {
		const reg = new ComponentRegistry()
		reg.register(buttonDef)
		expect(reg.get('button')).toBe(buttonDef)
		expect(reg.has('button')).toBe(true)
		expect(reg.has('unknown')).toBe(false)
	})

	it('registerAll adds multiple components', () => {
		const reg = new ComponentRegistry()
		reg.registerAll([buttonDef, calloutDef])
		expect(reg.names()).toEqual(['button', 'callout'])
	})

	it('knownTags returns Set of names', () => {
		const reg = new ComponentRegistry()
		reg.registerAll([buttonDef, calloutDef])
		const tags = reg.knownTags()
		expect(tags).toBeInstanceOf(Set)
		expect(tags.has('button')).toBe(true)
		expect(tags.has('callout')).toBe(true)
	})

	it('validates correct props', () => {
		const reg = new ComponentRegistry()
		reg.register(buttonDef)
		const result = reg.validate('button', { action: 'continue', label: 'Go' })
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
		expect(result.props).toEqual({ action: 'continue', label: 'Go' })
	})

	it('validates with optional props', () => {
		const reg = new ComponentRegistry()
		reg.register(buttonDef)
		const result = reg.validate('button', {
			action: 'continue',
			label: 'Go',
			variant: 'secondary',
		})
		expect(result.valid).toBe(true)
	})

	it('rejects invalid props', () => {
		const reg = new ComponentRegistry()
		reg.register(buttonDef)
		const result = reg.validate('button', { action: 123 })
		expect(result.valid).toBe(false)
		expect(result.errors.length).toBeGreaterThan(0)
	})

	it('rejects unknown component', () => {
		const reg = new ComponentRegistry()
		const result = reg.validate('unknown', {})
		expect(result.valid).toBe(false)
		expect(result.errors).toEqual(['Unknown component: unknown'])
	})
})

describe('Coercion in built-in definitions', () => {
	it('coerces numbers to strings in table rows', () => {
			const reg = new ComponentRegistry()
		reg.register(table)
		const result = reg.validate('table', {
			headers: ['Product', 'Units', 'Revenue'],
			rows: [['Shoes', 842, '$33,680'], ['Hats', 631, '$18,930']],
		})
		expect(result.valid).toBe(true)
		expect(result.props?.rows).toEqual([['Shoes', '842', '$33,680'], ['Hats', '631', '$18,930']])
	})

	it('coerces numbers to strings in table headers', () => {
			const reg = new ComponentRegistry()
		reg.register(table)
		const result = reg.validate('table', {
			headers: [1, 2, 3],
			rows: [['a', 'b', 'c']],
		})
		expect(result.valid).toBe(true)
		expect(result.props?.headers).toEqual(['1', '2', '3'])
	})

	it('coerces string values to numbers in chart', () => {
			const reg = new ComponentRegistry()
		reg.register(chart)
		const result = reg.validate('chart', {
			type: 'bar',
			labels: ['Q1', 'Q2'],
			values: ['100', '200'],
		})
		expect(result.valid).toBe(true)
		expect(result.props?.values).toEqual([100, 200])
	})

	it('coerces numbers to strings in tabs labels', () => {
			const reg = new ComponentRegistry()
		reg.register(tabs)
		const result = reg.validate('tabs', {
			labels: [2024, 2025, 2026],
		})
		expect(result.valid).toBe(true)
		expect(result.props?.labels).toEqual(['2024', '2025', '2026'])
	})

	it('coerces numbers to strings in select options', () => {
			const reg = new ComponentRegistry()
		reg.register(select)
		const result = reg.validate('select', {
			name: 'qty',
			options: [1, 2, 3, 4, 5],
		})
		expect(result.valid).toBe(true)
		expect(result.props?.options).toEqual(['1', '2', '3', '4', '5'])
	})
})
