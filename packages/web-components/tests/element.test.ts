import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTION_EVENT, defineMdocUI, ERROR_EVENT, type MdocUIElement } from '../src/element'

defineMdocUI()

function create(): MdocUIElement {
	const el = document.createElement('mdoc-ui') as MdocUIElement
	document.body.appendChild(el)
	return el
}

beforeEach(() => {
	document.body.innerHTML = ''
})

describe('registration', () => {
	it('registers on import', () => {
		expect(customElements.get('mdoc-ui')).toBeDefined()
	})

	it('does not throw when defined twice', () => {
		expect(() => defineMdocUI()).not.toThrow()
		expect(() => defineMdocUI()).not.toThrow()
	})

	it('can register under another name', () => {
		defineMdocUI('my-mdoc')
		expect(customElements.get('my-mdoc')).toBeDefined()
	})
})

describe('rendering', () => {
	it('renders prose as elements, not markup', () => {
		const el = create()
		el.markup = 'Hello **world** with a [link](https://x.com)'
		expect(el.querySelector('strong')?.textContent).toBe('world')
		expect(el.querySelector('a')?.getAttribute('href')).toBe('https://x.com')
	})

	it('renders static components from the shared descriptions', () => {
		const el = create()
		el.markup = '{% callout type="warning" title="T" %}body{% /callout %}'
		const callout = el.querySelector('[data-mdocui-callout]')
		expect(callout).not.toBeNull()
		expect(callout?.getAttribute('role')).toBe('alert')
		expect(callout?.textContent).toContain('body')
	})

	it('renders nested components', () => {
		const el = create()
		el.markup =
			'{% card title="C" %}{% grid cols=2 %}{% stat label="A" value="1" /%}{% stat label="B" value="2" /%}{% /grid %}{% /card %}'
		expect(el.querySelectorAll('[data-mdocui-stat]')).toHaveLength(2)
		expect(el.querySelector('[data-mdocui-card]')).not.toBeNull()
		expect(el.querySelector('[data-mdocui-grid]')).not.toBeNull()
	})

	it('renders a chart with its data in the accessible label', () => {
		const el = create()
		el.markup = '{% chart type="bar" labels=["Jan","Feb"] values=[1,2] title="R" /%}'
		const label = el.querySelector('[role="img"]')?.getAttribute('aria-label') ?? ''
		expect(label).toContain('R')
		expect(label).toContain('Jan 1')
		expect(label).toContain('Feb 2')
	})

	it('never turns markup in prose into elements', () => {
		const el = create()
		el.markup = 'a <img src=x onerror=alert(1)> b'
		expect(el.querySelector('img')).toBeNull()
		expect(el.textContent).toContain('<img src=x onerror=alert(1)>')
	})

	it('drops links with an unsafe scheme', () => {
		const el = create()
		el.markup = 'see [x](javascript:alert(1))'
		expect(el.querySelector('a')).toBeNull()
		expect(el.textContent).toContain('x')
	})
})

describe('streaming', () => {
	it('produces the same DOM however the input is chunked', () => {
		const markup =
			'Intro **text**\n\n{% card title="C" %}{% stat label="A" value="1" /%}{% /card %}\n\nAfter.'
		const whole = create()
		whole.markup = markup
		const expected = whole.innerHTML

		for (const size of [1, 2, 3, 5, 17]) {
			document.body.innerHTML = ''
			const el = create()
			for (let i = 0; i < markup.length; i += size) el.push(markup.slice(i, i + size))
			el.done()
			expect(el.innerHTML, `chunk size ${size}`).toBe(expected)
		}
	})

	it('leaves already-rendered nodes alone as more arrives', () => {
		const el = create()
		el.push('{% divider /%}')
		const first = el.firstElementChild
		el.push('\n\nmore prose')
		el.push('\n\n{% divider /%}')
		el.done()
		// the first divider is the same element object, not a rebuilt one
		expect(el.firstElementChild).toBe(first)
	})

	it('enables controls once the stream ends', () => {
		const el = create()
		el.push('{% toggle name="n" label="L" /%}')
		expect(el.querySelector('input')?.disabled).toBe(true)
		el.done()
		expect(el.querySelector('input')?.disabled).toBe(false)
	})

	it('clears on reset', () => {
		const el = create()
		el.markup = '{% divider /%}'
		expect(el.children.length).toBeGreaterThan(0)
		el.reset()
		expect(el.children.length).toBe(0)
	})
})

describe('actions', () => {
	it('emits a bubbling action event on click', () => {
		const el = create()
		el.markup = '{% button action="go" label="Go" /%}'
		const seen = vi.fn()
		document.addEventListener(ACTION_EVENT, seen)
		el.querySelector('button')?.click()
		expect(seen).toHaveBeenCalledTimes(1)
		const detail = seen.mock.calls[0][0].detail
		expect(detail.action).toBe('go')
		expect(detail.type).toBe('button_click')
		document.removeEventListener(ACTION_EVENT, seen)
	})

	it('emits form state on submit', () => {
		const el = create()
		el.markup = '{% form name="f" %}{% input name="email" label="Email" /%}{% /form %}'
		const seen = vi.fn()
		el.addEventListener(ACTION_EVENT, seen)
		const input = el.querySelector('input') as HTMLInputElement
		input.value = 'a@b.com'
		el.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }))
		expect(seen).toHaveBeenCalled()
		expect(seen.mock.calls[0][0].detail.formState).toEqual({ email: 'a@b.com' })
	})

	it('reports a failing component without losing the rest', () => {
		const el = create()
		el.components = {
			badge: () => {
				throw new Error('boom')
			},
		}
		const seen = vi.fn()
		el.addEventListener(ERROR_EVENT, seen)
		el.markup = '{% badge label="x" /%}{% divider /%}'
		expect(seen).toHaveBeenCalledTimes(1)
		expect(seen.mock.calls[0][0].detail.componentName).toBe('badge')
		expect(el.querySelector('[data-mdocui-divider]')).not.toBeNull()
	})
})

describe('accessibility', () => {
	it('gives each control a unique id even when names collide', () => {
		const el = create()
		el.markup = '{% input name="email" label="A" /%}{% input name="email" label="B" /%}'
		const ids = Array.from(el.querySelectorAll('input')).map((i) => i.id)
		expect(ids).toHaveLength(2)
		expect(ids[0]).not.toBe(ids[1])
	})

	it('points every label at an existing control', () => {
		const el = create()
		el.markup = '{% input name="a" label="A" /%}{% select name="b" label="B" options=["x"] /%}'
		for (const label of Array.from(el.querySelectorAll('label[for]'))) {
			expect(el.querySelector(`#${CSS.escape(label.getAttribute('for') as string)}`)).not.toBeNull()
		}
	})

	it('implements the tab pattern with a roving tab stop', () => {
		const el = create()
		el.markup =
			'{% tabs labels=["One","Two"] %}{% tab label="One" %}first{% /tab %}{% tab label="Two" %}second{% /tab %}{% /tabs %}'
		const tabsEls = Array.from(el.querySelectorAll('[role="tab"]')) as HTMLElement[]
		expect(tabsEls).toHaveLength(2)
		expect(tabsEls[0].getAttribute('aria-selected')).toBe('true')
		expect(tabsEls[0].tabIndex).toBe(0)
		expect(tabsEls[1].tabIndex).toBe(-1)

		const tablist = el.querySelector('[role="tablist"]') as HTMLElement
		expect(tablist.getAttribute('aria-orientation')).toBe('horizontal')
		tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
		expect(tabsEls[1].getAttribute('aria-selected')).toBe('true')
		tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
		expect(tabsEls[0].getAttribute('aria-selected')).toBe('true')
	})

	it('takes a submitted form out of the tab order', () => {
		const el = create()
		el.markup = '{% form name="f" %}{% input name="a" label="A" /%}{% /form %}'
		const formEl = el.querySelector('form') as HTMLFormElement
		formEl.dispatchEvent(new Event('submit', { cancelable: true }))
		expect(formEl.hasAttribute('inert')).toBe(true)
		expect(formEl.getAttribute('aria-hidden')).toBe('true')
	})

	it('marks table headers as column headers', () => {
		const el = create()
		el.markup = '{% table headers=["A","B"] rows=[["1","2"]] /%}'
		const ths = Array.from(el.querySelectorAll('th'))
		expect(ths).toHaveLength(2)
		for (const th of ths) expect(th.getAttribute('scope')).toBe('col')
	})
})
