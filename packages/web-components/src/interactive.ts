import type { ActionEvent } from '@mdocui/core'
import { append } from './dom'

export interface InteractiveArgs {
	props: Record<string, unknown>
	className?: string
	/** Read live, not captured: controls outlive the stream they were built in. */
	isStreaming: () => boolean
	emit: (event: ActionEvent) => void
	slot: Node | Node[] | null
	uid: () => string
}

/** Disable while streaming. The marker says why, so we can undo it later. */
export function markStreamDisabled(el: HTMLInputElement | HTMLSelectElement): void {
	el.disabled = true
	el.setAttribute('aria-disabled', 'true')
	el.setAttribute('data-mdocui-stream-disabled', 'true')
}

/** Undo the above. Controls disabled for other reasons stay disabled. */
export function releaseStreamDisabled(root: ParentNode): void {
	for (const el of Array.from(root.querySelectorAll('[data-mdocui-stream-disabled]'))) {
		const control = el as HTMLInputElement | HTMLSelectElement
		control.disabled = false
		control.removeAttribute('aria-disabled')
		control.removeAttribute('data-mdocui-stream-disabled')
	}
}

function styled(el: HTMLElement, className: string | undefined, style: Record<string, string>) {
	if (className) {
		el.className = className
		return
	}
	for (const [k, v] of Object.entries(style)) {
		;(el.style as unknown as Record<string, string>)[k] = v
	}
}

/** Label plus control, wired together by an id unique to this instance. */
function labelled(
	wrapper: HTMLElement,
	control: HTMLElement,
	label: string | undefined,
	name: string,
	id: string,
	className: string | undefined,
) {
	if (label) {
		const el = document.createElement('label')
		el.setAttribute('for', id)
		el.setAttribute('data-mdocui-label', 'true')
		if (!className) {
			el.style.display = 'block'
			el.style.marginBottom = '4px'
			el.style.fontWeight = '500'
		}
		el.appendChild(document.createTextNode(label))
		wrapper.appendChild(el)
	} else {
		control.setAttribute('aria-label', name)
	}
}

export function button({ props, className, isStreaming, emit }: InteractiveArgs): HTMLElement {
	const action = props.action as string
	const label = props.label as string
	const el = document.createElement('button')
	el.type = 'button'
	el.setAttribute('data-mdocui-button', 'true')
	el.setAttribute('data-variant', (props.variant as string) ?? 'primary')

	let clicked = false
	const sync = () => {
		const ownDisabled = (props.disabled as boolean) === true || clicked
		const disabled = isStreaming() || ownDisabled
		el.disabled = disabled
		if (disabled) el.setAttribute('data-disabled', 'true')
		else el.removeAttribute('data-disabled')
		if (isStreaming() && !ownDisabled) el.setAttribute('data-mdocui-stream-disabled', 'true')
		else el.removeAttribute('data-mdocui-stream-disabled')
		if (!className) el.style.cursor = disabled ? 'not-allowed' : 'pointer'
		if (!className) el.style.opacity = disabled ? '0.5' : '1'
	}

	styled(el, className, {
		padding: '8px 16px',
		borderRadius: '6px',
		color: 'inherit',
		background: 'none',
		border: '1px solid currentColor',
		outline: 'revert',
	})
	sync()

	el.addEventListener('click', () => {
		if (el.disabled) return
		const known = new Set(['action', 'label', 'disabled', 'variant'])
		const rest = Object.fromEntries(Object.entries(props).filter(([k]) => !known.has(k)))
		emit({
			type: 'button_click',
			action,
			label,
			tagName: 'button',
			...(Object.keys(rest).length > 0 && { params: rest }),
		})
		clicked = true
		sync()
	})

	el.appendChild(document.createTextNode(label))
	return el
}

export function link({ props, className, isStreaming, emit }: InteractiveArgs): HTMLElement {
	const rawUrl = props.url as string | undefined
	const url = rawUrl && /^https?:\/\//i.test(rawUrl) ? rawUrl : undefined
	const el = document.createElement('a')
	el.setAttribute('data-mdocui-link', 'true')
	el.setAttribute('href', url ?? '#')
	styled(el, className, {
		textDecoration: 'underline',
		cursor: 'pointer',
		color: 'inherit',
		outline: 'revert',
	})

	el.addEventListener('click', (e) => {
		e.preventDefault()
		if (isStreaming()) return
		emit({
			type: 'link_click',
			action: props.action as string,
			label: props.label as string,
			tagName: 'link',
			params: url ? { url } : undefined,
		})
	})

	el.appendChild(document.createTextNode(props.label as string))
	return el
}

export function input({ props, className, uid }: InteractiveArgs): HTMLElement {
	const name = props.name as string
	const label = props.label as string | undefined
	const id = `mdocui-${name}-${uid()}`

	const wrapper = document.createElement('div')
	if (className) wrapper.className = className
	wrapper.setAttribute('data-mdocui-input', 'true')

	const el = document.createElement('input')
	el.id = id
	el.name = name
	el.type = (props.type as string) ?? 'text'
	el.placeholder = (props.placeholder as string) ?? ''
	const required = (props.required as boolean) ?? false
	if (required) {
		el.required = true
		el.setAttribute('aria-required', 'true')
	}
	for (const [attr, key] of [
		['minlength', 'minLength'],
		['maxlength', 'maxLength'],
		['pattern', 'pattern'],
		['min', 'min'],
		['max', 'max'],
		['step', 'step'],
	] as const) {
		const value = props[key]
		if (value !== undefined) el.setAttribute(attr, String(value))
	}
	if (!className) {
		el.style.width = '100%'
		el.style.padding = '8px 12px'
		el.style.border = '1px solid currentColor'
		el.style.borderRadius = '6px'
		el.style.background = 'transparent'
		el.style.color = 'inherit'
	}

	labelled(wrapper, el, label, name, id, className)
	wrapper.appendChild(el)
	return wrapper
}

export function textarea({ props, className, uid }: InteractiveArgs): HTMLElement {
	const name = props.name as string
	const label = props.label as string | undefined
	const id = `mdocui-${name}-${uid()}`

	const wrapper = document.createElement('div')
	if (className) wrapper.className = className
	wrapper.setAttribute('data-mdocui-textarea', 'true')

	const el = document.createElement('textarea')
	el.id = id
	el.name = name
	el.placeholder = (props.placeholder as string) ?? ''
	el.rows = (props.rows as number) ?? 3
	const required = (props.required as boolean) ?? false
	if (required) {
		el.required = true
		el.setAttribute('aria-required', 'true')
	}
	if (props.minLength !== undefined) el.setAttribute('minlength', String(props.minLength))
	if (props.maxLength !== undefined) el.setAttribute('maxlength', String(props.maxLength))
	if (!className) {
		el.style.width = '100%'
		el.style.padding = '8px 12px'
		el.style.border = '1px solid currentColor'
		el.style.borderRadius = '6px'
		el.style.background = 'transparent'
		el.style.color = 'inherit'
	}

	labelled(wrapper, el, label, name, id, className)
	wrapper.appendChild(el)
	return wrapper
}

export function toggle({ props, className, isStreaming, emit }: InteractiveArgs): HTMLElement {
	const name = props.name as string
	const wrapper = document.createElement('label')
	if (className) wrapper.className = className
	wrapper.setAttribute('data-mdocui-toggle', 'true')
	if (!className) {
		wrapper.style.display = 'flex'
		wrapper.style.alignItems = 'center'
		wrapper.style.gap = '8px'
		wrapper.style.cursor = 'pointer'
	}

	const el = document.createElement('input')
	el.type = 'checkbox'
	el.setAttribute('role', 'switch')
	el.name = name
	el.checked = (props.checked as boolean) ?? false
	el.setAttribute('aria-checked', String(el.checked))
	if (isStreaming()) markStreamDisabled(el)

	el.addEventListener('change', () => {
		if (isStreaming()) return
		el.setAttribute('aria-checked', String(el.checked))
		emit({
			type: 'select_change',
			action: `change:${name}`,
			tagName: 'toggle',
			params: { name, value: el.checked },
		})
	})

	const text = document.createElement('span')
	text.appendChild(document.createTextNode(props.label as string))
	wrapper.appendChild(el)
	wrapper.appendChild(text)
	return wrapper
}

export function checkbox({ props, className, isStreaming, emit }: InteractiveArgs): HTMLElement {
	const name = props.name as string
	const wrapper = document.createElement('label')
	if (className) wrapper.className = className
	wrapper.setAttribute('data-mdocui-checkbox', 'true')
	if (!className) {
		wrapper.style.display = 'flex'
		wrapper.style.alignItems = 'center'
		wrapper.style.gap = '8px'
		wrapper.style.cursor = 'pointer'
	}

	const el = document.createElement('input')
	el.type = 'checkbox'
	el.name = name
	el.checked = (props.checked as boolean) ?? false
	if (isStreaming()) markStreamDisabled(el)

	el.addEventListener('change', () => {
		if (isStreaming()) return
		emit({
			type: 'select_change',
			action: `change:${name}`,
			tagName: 'checkbox',
			params: { name, value: el.checked },
		})
	})

	const text = document.createElement('span')
	text.appendChild(document.createTextNode(props.label as string))
	wrapper.appendChild(el)
	wrapper.appendChild(text)
	return wrapper
}

export function select({ props, className, isStreaming, emit, uid }: InteractiveArgs): HTMLElement {
	const name = props.name as string
	const label = props.label as string | undefined
	const id = `mdocui-${name}-${uid()}`
	const options = Array.isArray(props.options) ? props.options : []

	const wrapper = document.createElement('div')
	if (className) wrapper.className = className
	wrapper.setAttribute('data-mdocui-select', 'true')

	const el = document.createElement('select')
	el.id = id
	el.name = name
	const required = (props.required as boolean) ?? false
	if (required) {
		el.required = true
		el.setAttribute('aria-required', 'true')
	}
	if (isStreaming()) markStreamDisabled(el)
	if (!className) {
		el.style.width = '100%'
		el.style.padding = '8px 12px'
		el.style.border = '1px solid currentColor'
		el.style.borderRadius = '6px'
		el.style.background = 'transparent'
		el.style.color = 'inherit'
	}

	const placeholder = props.placeholder as string | undefined
	if (placeholder) {
		const opt = document.createElement('option')
		opt.value = ''
		opt.appendChild(document.createTextNode(placeholder))
		el.appendChild(opt)
	}
	for (const value of options) {
		const opt = document.createElement('option')
		opt.value = String(value)
		opt.appendChild(document.createTextNode(String(value)))
		el.appendChild(opt)
	}

	el.addEventListener('change', () => {
		if (isStreaming()) return
		emit({
			type: 'select_change',
			action: `change:${name}`,
			tagName: 'select',
			params: { name, value: el.value },
		})
	})

	labelled(wrapper, el, label, name, id, className)
	wrapper.appendChild(el)
	return wrapper
}

export function form({ props, className, isStreaming, emit, slot }: InteractiveArgs): HTMLElement {
	const formName = props.name as string
	const action = (props.action as string) ?? `submit:${formName}`

	const el = document.createElement('form')
	if (className) el.className = className
	el.setAttribute('data-mdocui-form', 'true')
	el.setAttribute('data-name', formName)
	if (!className) {
		el.style.display = 'flex'
		el.style.flexDirection = 'column'
		el.style.gap = '12px'
	}
	append(el, slot)

	let submitted = false
	el.addEventListener('submit', (e) => {
		e.preventDefault()
		if (isStreaming() || submitted) return

		const data = new FormData(el)
		const state: Record<string, unknown> = {}
		for (const key of new Set(data.keys())) {
			const values = data.getAll(key)
			state[key] = values.length === 1 ? values[0] : values
		}
		emit({ type: 'form_submit', action, formName, formState: state, tagName: 'form' })

		submitted = true
		el.setAttribute('data-submitted', 'true')
		el.setAttribute('aria-hidden', 'true')
		// inert too: aria-hidden alone leaves the fields tab-focusable.
		el.setAttribute('inert', '')
		el.style.opacity = '0.5'
		el.style.pointerEvents = 'none'
	})

	return el
}

export function tabs({ props, className, slot, uid }: InteractiveArgs): HTMLElement {
	const labels = Array.isArray(props.labels) ? (props.labels as string[]) : []
	const panels = (Array.isArray(slot) ? slot : slot ? [slot] : []) as Node[]
	const tabsId = `mdocui-tabs-${uid()}`
	let active = (props.active as number) ?? 0

	const root = document.createElement('div')
	if (className) root.className = className
	root.setAttribute('data-mdocui-tabs', 'true')

	const tablist = document.createElement('div')
	tablist.setAttribute('role', 'tablist')
	tablist.setAttribute('data-mdocui-tablist', 'true')
	tablist.setAttribute('aria-label', labels.join(', '))
	tablist.setAttribute('aria-orientation', 'horizontal')
	if (!className) {
		tablist.style.display = 'flex'
		tablist.style.gap = '4px'
	}

	const panel = document.createElement('div')
	panel.setAttribute('role', 'tabpanel')
	panel.setAttribute('data-mdocui-tabpanel', 'true')
	if (!className) panel.style.paddingTop = '8px'

	const buttons: HTMLButtonElement[] = labels.map((label, i) => {
		const b = document.createElement('button')
		b.type = 'button'
		b.id = `${tabsId}-tab-${i}`
		b.setAttribute('role', 'tab')
		b.setAttribute('data-mdocui-tab-button', 'true')
		b.setAttribute('aria-controls', `${tabsId}-panel-${i}`)
		if (!className) {
			b.style.padding = '8px 16px'
			b.style.background = 'none'
			b.style.border = 'none'
			b.style.cursor = 'pointer'
			b.style.color = 'inherit'
			b.style.outline = 'revert'
		}
		b.appendChild(document.createTextNode(label))
		b.addEventListener('click', () => show(i))
		tablist.appendChild(b)
		return b
	})

	function show(index: number) {
		active = index
		buttons.forEach((b, i) => {
			b.setAttribute('aria-selected', String(i === index))
			// Roving tab stop: one button reachable by Tab, arrows move between them.
			b.tabIndex = i === index ? 0 : -1
			if (!className) b.style.fontWeight = i === index ? '600' : '400'
		})
		panel.id = `${tabsId}-panel-${index}`
		panel.setAttribute('aria-labelledby', `${tabsId}-tab-${index}`)
		while (panel.firstChild) panel.removeChild(panel.firstChild)
		const content = panels[index] ?? panels[0]
		if (content) panel.appendChild(content)
	}

	tablist.addEventListener('keydown', (e) => {
		let next: number
		if (e.key === 'ArrowRight') next = (active + 1) % labels.length
		else if (e.key === 'ArrowLeft') next = (active - 1 + labels.length) % labels.length
		else if (e.key === 'Home') next = 0
		else if (e.key === 'End') next = labels.length - 1
		else return
		e.preventDefault()
		show(next)
		buttons[next]?.focus()
	})

	root.appendChild(tablist)
	root.appendChild(panel)
	show(active)
	return root
}
