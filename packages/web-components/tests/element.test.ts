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

	it('produces the same DOM for id-bearing components however it is chunked', () => {
		// ids are unique per instance, so normalise them first. Structure is what
		// has to match, not the counter.
		const strip = (html: string) => html.replace(/mdocui-[a-z]+-\d+/g, 'ID')
		const markup =
			'{% form name="f" %}{% input name="email" label="Email" /%}{% select name="p" label="Plan" options=["a","b"] /%}{% /form %}{% tabs labels=["One","Two"] %}{% tab label="One" %}x{% /tab %}{% tab label="Two" %}y{% /tab %}{% /tabs %}'

		const whole = create()
		whole.markup = markup
		const expected = strip(whole.innerHTML)

		for (const size of [1, 2, 3, 5, 17]) {
			const el = create()
			for (let i = 0; i < markup.length; i += size) el.push(markup.slice(i, i + size))
			el.done()
			expect(strip(el.innerHTML), `chunk size ${size}`).toBe(expected)
		}
	})

	it('keeps what the user typed when the stream ends', () => {
		const el = create()
		el.push('{% form name="f" %}{% input name="email" label="Email" /%}{% /form %}')
		const input = el.querySelector('input') as HTMLInputElement
		input.value = 'typed before the end'
		input.focus()

		el.done()

		// same element, same value, still focused: done() must not rebuild it
		expect(el.querySelector('input')).toBe(input)
		expect((el.querySelector('input') as HTMLInputElement).value).toBe('typed before the end')
		expect(document.activeElement).toBe(input)
	})

	it('re-enables stream-disabled controls without rebuilding them', () => {
		const el = create()
		el.push('{% toggle name="n" label="L" /%}')
		const toggle = el.querySelector('input') as HTMLInputElement
		expect(toggle.disabled).toBe(true)

		el.done()

		expect(el.querySelector('input')).toBe(toggle)
		expect(toggle.disabled).toBe(false)
		expect(toggle.hasAttribute('aria-disabled')).toBe(false)
	})

	it('leaves a control disabled by its own prop disabled', () => {
		const el = create()
		el.markup = '{% button action="a" label="L" disabled=true /%}'
		expect((el.querySelector('button') as HTMLButtonElement).disabled).toBe(true)
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

describe('prose structure matches the react renderer', () => {
	it('wraps blocks in a div, not a span', () => {
		const el = create()
		el.markup = 'A paragraph.\n\n- one\n- two'
		const wrapper = el.querySelector('[data-mdocui-prose]') as HTMLElement
		// a span holding a <p> or a <ul> is invalid HTML
		expect(wrapper.tagName).toBe('DIV')
		expect(wrapper.querySelector('p')).not.toBeNull()
		expect(wrapper.querySelector('ul')).not.toBeNull()
	})

	it('uses a span when there are no blocks', () => {
		const el = create()
		el.markup = '   '
		const wrapper = el.querySelector('[data-mdocui-prose]') as HTMLElement
		expect(wrapper?.tagName).toBe('SPAN')
	})

	it('turns a newline inside a paragraph into a line break', () => {
		const el = create()
		el.markup = 'first line\nsecond line'
		const p = el.querySelector('p') as HTMLElement
		expect(p.querySelectorAll('br')).toHaveLength(1)
		expect(p.textContent).toBe('first linesecond line')
	})

	it('carries the same block spacing as the react renderer', () => {
		const el = create()
		el.markup = 'text\n\n- a'
		expect((el.querySelector('p') as HTMLElement).style.margin).toBe('0.25em 0px')
		const list = el.querySelector('ul') as HTMLElement
		expect(list.style.margin).toBe('0.25em 0px')
		expect(list.style.paddingLeft).toBe('1.5em')
	})

	it('marks the wrapper the same way', () => {
		const el = create()
		el.markup = 'hello'
		expect(el.querySelector('[data-mdocui-prose]')?.getAttribute('data-mdocui-prose')).toBe('true')
	})
})

describe('button rows', () => {
	it('groups consecutive buttons into one row', () => {
		const el = create()
		el.markup = '{% button action="a" label="A" /%}\n\n{% button action="b" label="B" /%}'
		const rows = el.querySelectorAll('[data-mdocui-button-row]')
		expect(rows).toHaveLength(1)
		expect(rows[0].querySelectorAll('button')).toHaveLength(2)
	})

	it('starts a new row after other content', () => {
		const el = create()
		el.markup =
			'{% button action="a" label="A" /%}\n\ntext between\n\n{% button action="b" label="B" /%}'
		expect(el.querySelectorAll('[data-mdocui-button-row]')).toHaveLength(2)
	})

	it('does not wrap a button nested inside another component', () => {
		const el = create()
		el.markup = '{% card title="C" %}{% button action="a" label="A" /%}{% /card %}'
		expect(el.querySelectorAll('[data-mdocui-button-row]')).toHaveLength(0)
		expect(el.querySelectorAll('button')).toHaveLength(1)
	})

	it('grows the row as more buttons stream in', () => {
		const el = create()
		el.push('{% button action="a" label="A" /%}')
		expect(el.querySelectorAll('[data-mdocui-button-row] button')).toHaveLength(1)
		el.push('\n\n{% button action="b" label="B" /%}')
		el.done()
		const rows = el.querySelectorAll('[data-mdocui-button-row]')
		expect(rows).toHaveLength(1)
		expect(rows[0].querySelectorAll('button')).toHaveLength(2)
	})
})

describe('host layout', () => {
	it('lays out top-level blocks as a spaced column, like the react root', () => {
		const el = create()
		el.markup = 'a\n\n{% divider /%}'
		expect(el.style.display).toBe('flex')
		expect(el.style.flexDirection).toBe('column')
		expect(el.style.gap).toBe('8px')
		expect(el.getAttribute('data-mdocui')).toBe('true')
	})

	it('leaves the host alone if the page already styled it', () => {
		const el = document.createElement('mdoc-ui') as MdocUIElement
		el.setAttribute('style', 'display: grid')
		document.body.appendChild(el)
		el.markup = 'a'
		expect(el.style.display).toBe('grid')
	})
})

describe('streaming without flicker', () => {
	it('keeps the same element while the tail grows', () => {
		const el = create()
		el.push('Some prose that ')
		const first = el.firstElementChild
		const firstP = el.querySelector('p')
		el.push('keeps on ')
		el.push('growing as it streams.')
		el.done()
		// same nodes, updated in place, not rebuilt
		expect(el.firstElementChild).toBe(first)
		expect(el.querySelector('p')).toBe(firstP)
		expect(el.textContent).toContain('keeps on growing as it streams.')
	})

	it('does not remove nodes while the tail grows', () => {
		const el = create()
		el.push('one ')
		let removed = 0
		const obs = new MutationObserver((records) => {
			for (const r of records) removed += r.removedNodes.length
		})
		obs.observe(el, { childList: true, subtree: true, characterData: true })
		el.push('two ')
		el.push('three')
		el.done()
		obs.disconnect()
		expect(removed).toBe(0)
	})

	it('preserves a text selection inside the growing tail', () => {
		const el = create()
		el.push('hello world ')
		const p = el.querySelector('p') as HTMLElement
		const textNode = p.firstChild as Text
		el.push('and more text')
		el.done()
		// the very same text node survived, so a selection anchored in it would too
		expect(el.querySelector('p')?.firstChild).toBe(textNode)
	})

	it('still replaces when the tag actually changes', () => {
		const el = create()
		el.push('plain text')
		const before = el.firstElementChild?.tagName
		el.push('\n\n- now a list')
		el.done()
		expect(before).toBe('DIV')
		expect(el.querySelector('ul')).not.toBeNull()
	})
})
