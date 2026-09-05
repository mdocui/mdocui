import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { defineMdocUI, type MdocUIElement } from '../src/element'

defineMdocUI()

// Captured verbatim from a streamed model response, so this exercises the
// shapes a model actually produces rather than ones written to pass.
const raw = readFileSync(join(__dirname, 'fixtures/real-response.md'), 'utf8')

describe('real model output', () => {
	it('renders every component from a live response', () => {
		const el = document.createElement('mdoc-ui') as MdocUIElement
		document.body.appendChild(el)
		el.markup = raw
		const found = {
			card: el.querySelectorAll('[data-mdocui-card]').length,
			grid: el.querySelectorAll('[data-mdocui-grid]').length,
			stat: el.querySelectorAll('[data-mdocui-stat]').length,
			divider: el.querySelectorAll('[data-mdocui-divider]').length,
			chart: el.querySelectorAll('[data-mdocui-chart]').length,
			callout: el.querySelectorAll('[data-mdocui-callout]').length,
			table: el.querySelectorAll('[data-mdocui-table]').length,
			buttonGroup: el.querySelectorAll('[data-mdocui-button-group]').length,
			button: el.querySelectorAll('[data-mdocui-button]').length,
		}
		expect(found).toEqual({
			card: 1,
			grid: 1,
			stat: 3,
			divider: 4,
			chart: 1,
			callout: 1,
			table: 1,
			buttonGroup: 1,
			button: 2,
		})
	})

	it('gives the same DOM streamed as in one go', () => {
		const whole = document.createElement('mdoc-ui') as MdocUIElement
		document.body.appendChild(whole)
		whole.markup = raw
		const expected = whole.innerHTML

		for (const size of [1, 3, 4, 17, 64]) {
			const el = document.createElement('mdoc-ui') as MdocUIElement
			document.body.appendChild(el)
			for (let i = 0; i < raw.length; i += size) el.push(raw.slice(i, i + size))
			el.done()
			expect(el.innerHTML, `chunk ${size}`).toBe(expected)
		}
	})

	it('carries the chart data in the accessible label', () => {
		const el = document.createElement('mdoc-ui') as MdocUIElement
		document.body.appendChild(el)
		el.markup = raw
		const label = el.querySelector('[data-mdocui-chart]')?.getAttribute('aria-label') ?? ''
		expect(label).toContain('data point')
	})
})
