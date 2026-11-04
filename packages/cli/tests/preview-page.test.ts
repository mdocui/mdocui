import vm from 'node:vm'
import { afterEach, expect, it, vi } from 'vitest'
import { buildHTML } from '../src/commands/preview-page'

// Run the shipped inline script without a browser dependency. Layout is checked in-browser.
class Element {
	value = ''
	textContent = ''
	innerHTML = ''
	disabled = false
	max = '0'
	clientWidth = 1000
	offsetWidth = 24
	clientHeight = 200
	scrollHeight = 400
	scrollTop = 0
	style = { setProperty: vi.fn(), flex: '', height: '', display: '' }
	attributes = new Map<string, string>()
	listeners = new Map<string, () => void>()
	addEventListener(event: string, listener: () => void): void {
		this.listeners.set(event, listener)
	}
	setAttribute(name: string, value: string): void {
		this.attributes.set(name, value)
	}
	getBoundingClientRect(): { width: number; height: number } {
		return { width: 500, height: 210 }
	}
	fire(event: string): void {
		this.listeners.get(event)?.()
	}
}

function playground(reducedMotion = false) {
	vi.useFakeTimers()
	const elements = new Map<string, Element>()
	const element = (id: string): Element => {
		let node = elements.get(id)
		if (!node) {
			node = new Element()
			elements.set(id, node)
		}
		return node
	}
	element('chunk-size').value = '1'
	element('editor').value = '{% callout %}Body{% /callout %}'
	const fetch = vi.fn<(url: string, init: { body: string }) => Promise<Response>>()
	fetch.mockImplementation(async () => snapshot(false))
	const requestAnimationFrame = vi.fn((callback: () => void) => setTimeout(callback, 16))
	const html = buildHTML()
	const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
	if (!script) throw new Error('Preview script missing')
	vm.runInNewContext(script, {
		document: { getElementById: element, querySelector: element },
		window: {
			innerWidth: 1200,
			innerHeight: 900,
			matchMedia: () => ({ matches: reducedMotion }),
			addEventListener: () => {},
		},
		fetch,
		setTimeout,
		clearTimeout,
		requestAnimationFrame,
		cancelAnimationFrame: clearTimeout,
	})
	return { element, fetch, requestAnimationFrame }
}

function snapshot(final: boolean, content = 'Current'): Response {
	return Response.json({
		nodes: [{ type: 'prose', content }],
		meta: { errors: [], nodeCount: 1, isComplete: final },
		final,
	})
}

async function settle(): Promise<void> {
	for (let i = 0; i < 12; i++) await Promise.resolve()
}

afterEach(() => {
	vi.useRealTimers()
})

it('Restart returns to chunk zero and stays paused', async () => {
	const { element, fetch } = playground()
	element('replay-step').fire('click')
	await settle()
	element('replay-reset').fire('click')
	await settle()
	await vi.advanceTimersByTimeAsync(500)
	expect(fetch).toHaveBeenCalledTimes(2)
	expect(JSON.parse(fetch.mock.calls[1][1].body).through).toBe(0)
	expect(element('replay-play').attributes.get('aria-pressed')).toBe('false')
	expect(element('replay-seek').value).toBe('0')
})

it.each(['restart', 'chunk-size', 'sample'])(
	'does not resume an old cursor during pending %s',
	async (action) => {
		const { element, fetch } = playground()
		element('replay-seek').value = '10'
		element('replay-seek').fire('change')
		await settle()
		let resolve = (_response: Response): void => {}
		fetch.mockReturnValueOnce(
			new Promise<Response>((done) => {
				resolve = done
			}),
		)
		if (action === 'restart') element('replay-reset').fire('click')
		else if (action === 'chunk-size') {
			element('chunk-size').value = '4'
			element('chunk-size').fire('change')
		} else {
			element('replay-sample').value = 'boundaries'
			element('replay-sample').fire('change')
		}
		expect(element('replay-play').disabled).toBe(true)
		element('replay-play').fire('click')
		await vi.advanceTimersByTimeAsync(0)
		expect(fetch).toHaveBeenCalledTimes(2)
		resolve(snapshot(false))
		await settle()
		expect(element('replay-play').disabled).toBe(false)
		element('replay-play').fire('click')
		await vi.advanceTimersByTimeAsync(0)
		expect(JSON.parse(fetch.mock.calls.at(-1)?.[1].body ?? '{}').through).toBe(1)
	},
)

it('ignores replay responses superseded by an edit, even before debounce finishes', async () => {
	const { element, fetch } = playground()
	let resolve = (_response: Response): void => {}
	fetch.mockReturnValueOnce(
		new Promise<Response>((done) => {
			resolve = done
		}),
	)
	element('replay-step').fire('click')
	element('editor').value = 'New source'
	element('editor').fire('input')
	resolve(snapshot(false, 'Stale output'))
	await settle()
	expect(element('preview').innerHTML).not.toContain('Stale output')
	await vi.advanceTimersByTimeAsync(150)
	expect(fetch.mock.calls.at(-1)?.[0]).toBe('/api/parse')
	expect(element('preview').innerHTML).toContain('Current')
})

it('ignores an earlier seek response arriving after a later seek', async () => {
	const { element, fetch } = playground()
	let resolve = (_response: Response): void => {}
	fetch.mockReturnValueOnce(
		new Promise<Response>((done) => {
			resolve = done
		}),
	)
	element('replay-seek').value = '3'
	element('replay-seek').fire('change')
	element('replay-seek').value = '5'
	element('replay-seek').fire('change')
	await settle()
	resolve(snapshot(false, 'Stale seek'))
	await settle()
	expect(element('preview').innerHTML).toContain('Current')
	expect(element('preview').innerHTML).not.toContain('Stale seek')
	expect(element('replay-seek').value).toBe('5')
})

it('Step advances one chunk and Pause stops timers and pending responses', async () => {
	const { element, fetch } = playground()
	for (let i = 1; i <= 2; i++) {
		element('replay-step').fire('click')
		await settle()
		expect(JSON.parse(fetch.mock.calls.at(-1)?.[1].body ?? '{}').through).toBe(i)
	}
	let resolve = (_response: Response): void => {}
	fetch.mockReturnValueOnce(
		new Promise<Response>((done) => {
			resolve = done
		}),
	)
	element('replay-play').fire('click')
	await vi.advanceTimersByTimeAsync(0)
	element('replay-play').fire('click')
	resolve(snapshot(false, 'Paused response'))
	await settle()
	await vi.advanceTimersByTimeAsync(500)
	expect(fetch).toHaveBeenCalledTimes(3)
	expect(element('preview').innerHTML).not.toContain('Paused response')
	expect(element('replay-play').attributes.get('aria-pressed')).toBe('false')
	expect(element('replay-seek').value).toBe('2')
})

it('a superseded playback loop cannot schedule ticks after Pause and resume', async () => {
	const { element, fetch } = playground()
	let resolve = (_response: Response): void => {}
	fetch.mockReturnValueOnce(
		new Promise<Response>((done) => {
			resolve = done
		}),
	)
	element('replay-play').fire('click')
	await vi.advanceTimersByTimeAsync(0)
	element('replay-play').fire('click')
	element('replay-play').fire('click')
	await vi.advanceTimersByTimeAsync(0)
	resolve(snapshot(false, 'Old playback'))
	await settle()
	await vi.advanceTimersByTimeAsync(60)
	expect(fetch).toHaveBeenCalledTimes(3)
	expect(element('preview').innerHTML).not.toContain('Old playback')
})

it('ignores a live-parse response when replay has taken over', async () => {
	const { element, fetch } = playground()
	let resolve = (_response: Response): void => {}
	fetch.mockReturnValueOnce(
		new Promise<Response>((done) => {
			resolve = done
		}),
	)
	element('editor').fire('input')
	await vi.advanceTimersByTimeAsync(150)
	element('replay-step').fire('click')
	await settle()
	resolve(snapshot(true, 'Old parse'))
	await settle()
	expect(element('preview').innerHTML).toContain('Current')
	expect(element('preview').innerHTML).not.toContain('Old parse')
})

it('changing chunk size resets paused and clearing source clears inspectors and progress', async () => {
	const { element, fetch } = playground()
	element('replay-step').fire('click')
	await settle()
	element('chunk-size').value = '4'
	element('chunk-size').fire('change')
	await settle()
	expect(JSON.parse(fetch.mock.calls.at(-1)?.[1].body ?? '{}')).toMatchObject({
		through: 0,
		chunkSize: 4,
	})
	expect(element('replay-seek').value).toBe('0')
	expect(element('replay-play').attributes.get('aria-pressed')).toBe('false')
	element('editor').value = ''
	element('editor').fire('input')
	await vi.advanceTimersByTimeAsync(150)
	expect(element('replay-progress').textContent).toBe('0 / 0 chunks')
	expect(element('ast-inspector').textContent).toBe('')
	expect(element('meta-inspector').textContent).toBe('')
	expect(element('status').textContent).toBe('Ready')
})

it('surfaces API limits and stops playback instead of treating errors as snapshots', async () => {
	const { element, fetch } = playground()
	fetch.mockResolvedValueOnce(Response.json({ error: 'Increase chunk size' }, { status: 400 }))
	element('replay-play').fire('click')
	await vi.advanceTimersByTimeAsync(500)
	expect(fetch).toHaveBeenCalledTimes(1)
	expect(element('status').textContent).toBe('Replay error: Increase chunk size')
	expect(element('replay-play').attributes.get('aria-pressed')).toBe('false')
	expect(element('replay-step').disabled).toBe(false)
})

it('offers boundary and open-body samples, loaded at chunk zero paused', async () => {
	const { element, fetch } = playground()
	for (const sample of ['boundaries', 'open-body']) {
		element('replay-sample').value = sample
		element('replay-sample').fire('change')
		await settle()
		const request = JSON.parse(fetch.mock.calls.at(-1)?.[1].body ?? '{}') as {
			content: string
			chunkSize: number
			through: number
		}
		expect(request.chunkSize).toBe(1)
		expect(request.through).toBe(0)
		expect(request.content).toContain('{% callout type="info" %}')
		expect(request.content.includes('{% /callout %}')).toBe(sample === 'boundaries')
		expect(element('replay-play').attributes.get('aria-pressed')).toBe('false')
	}
})

it('marks only the open branch, not completed siblings with the same name', async () => {
	const { element, fetch } = playground()
	const closed = { type: 'component', name: 'callout', props: {}, children: [], selfClosing: false }
	fetch.mockResolvedValueOnce(
		Response.json({
			nodes: [closed, { ...closed, children: [closed, { ...closed, children: [] }] }],
			meta: { nodeCount: 1, errors: [], openTags: ['callout', 'callout'] },
			final: false,
		}),
	)
	element('replay-step').fire('click')
	await settle()
	expect(element('preview').innerHTML.match(/>in progress</g)).toHaveLength(2)
})

it('uses immediate following rather than smooth scrolling under reduced motion', async () => {
	const { element } = playground(true)
	element('replay-play').fire('click')
	await vi.advanceTimersByTimeAsync(20)
	expect(element('preview').scrollTop).toBe(element('preview').scrollHeight)
})

it('escapes array prop values and config names before injecting HTML', async () => {
	const { element, fetch } = playground()
	fetch.mockResolvedValueOnce(
		Response.json({
			nodes: [
				{
					type: 'component',
					name: 'callout',
					props: { items: ['<img src=x onerror=alert(1)>'] },
					children: [],
				},
			],
			meta: { nodeCount: 1, errors: [] },
			final: false,
		}),
	)
	element('replay-step').fire('click')
	await settle()
	expect(element('preview').innerHTML).not.toContain('<img')
	expect(element('preview').innerHTML).toContain('&lt;img')
	const html = buildHTML(new Set(['</script><script>alert(1)</script>']))
	expect(html.match(/<script>/g)).toHaveLength(1)
	expect(html).not.toContain('const knownTags = ["</script>')
})
