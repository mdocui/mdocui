import { spawn } from 'node:child_process'
import { once } from 'node:events'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ASTNode, ParseMeta } from '@mdocui/core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

interface ParseResponse {
	nodes: ASTNode[]
	meta: ParseMeta
}
interface ReplayResponse extends ParseResponse {
	through: number
	total: number
	final: boolean
}

const cliPath = path.resolve(__dirname, '../dist/index.js')
const definitionsPath = path.resolve(__dirname, '../../core/dist/index.js')

// Exercise the built CLI just as a consumer launches it; port 0 avoids local port clashes.
describe('preview HTTP API', () => {
	const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'mdocui-preview-'))
	let child: ReturnType<typeof spawn>
	let url = ''

	beforeAll(async () => {
		fs.writeFileSync(
			path.join(cwd, 'mdocui.config.mjs'),
			`
import { allDefinitions } from ${JSON.stringify(pathToFileURL(definitionsPath).href)}
export default { components: allDefinitions.filter(c => ['callout', 'button', 'divider'].includes(c.name)) }
`,
		)
		child = spawn(process.execPath, [cliPath, 'preview', '--port', '0'], {
			cwd,
			env: { ...process.env, NODE_OPTIONS: '' },
			stdio: ['ignore', 'pipe', 'pipe'],
		})
		await new Promise<void>((resolve, reject) => {
			let output = ''
			const timeout = setTimeout(() => reject(new Error('Preview startup timed out')), 5000)
			child.once('error', (error) => {
				clearTimeout(timeout)
				reject(error)
			})
			child.once('exit', (code) => {
				clearTimeout(timeout)
				reject(new Error(`Preview exited: ${code}`))
			})
			child.stdout?.on('data', (data: Buffer) => {
				output += data.toString()
				const address = output.match(/http:\/\/localhost:(\d+)/)
				if (!address || address[1] === '0') return
				url = `http://127.0.0.1:${address[1]}`
				clearTimeout(timeout)
				resolve()
			})
		})
	})

	afterAll(async () => {
		if (child && child.exitCode === null) {
			const exited = once(child, 'exit')
			child.kill()
			await exited
		}
		fs.rmSync(cwd, { recursive: true, force: true })
	})

	function post(endpoint: string, body: object | null): Promise<Response> {
		return fetch(`${url}/api/${endpoint}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		})
	}

	async function replay(content: string, through: number, chunkSize = 1): Promise<ReplayResponse> {
		const response = await post('replay', { content, through, chunkSize })
		expect(response.status).toBe(200)
		return response.json() as Promise<ReplayResponse>
	}

	it('serves the preview and loads component config from the working directory', async () => {
		const response = await fetch(url)
		expect(response.status).toBe(200)
		const html = await response.text()
		expect(html).toContain('Streaming replay controls')
		expect(html).toContain('const knownTags = ["divider","button","callout"]')
	})

	it('keeps the legacy complete-content response unchanged', async () => {
		const response = await post('parse', { content: 'Hello {% divider /%} world' })
		expect(response.status).toBe(200)
		const data = (await response.json()) as ParseResponse
		expect(Object.keys(data).sort()).toEqual(['meta', 'nodes'])
		expect(data.nodes).toEqual([
			{ type: 'prose', content: 'Hello ' },
			{ type: 'component', name: 'divider', props: {}, children: [], selfClosing: true },
			{ type: 'prose', content: ' world' },
		])
		expect(data.meta).toMatchObject({ errors: [], nodeCount: 3, isComplete: true })
	})

	it('does not flush a pending tag or an open body before the final chunk', async () => {
		const content = '{% callout type="info" %}Live body{% /callout %}'
		const pending = await replay(content, 12)
		expect(pending.final).toBe(false)
		expect(pending.nodes).toEqual([])
		expect(pending.meta).toMatchObject({ pendingTag: 'callout', isComplete: false, errors: [] })
		expect(pending.meta.bufferLength).toBeGreaterThan(0)
		const partial = await replay(content, 30)
		expect(partial.meta).toMatchObject({ openTags: ['callout'], isComplete: false, errors: [] })
		expect(partial.nodes).toEqual([
			{
				type: 'component',
				name: 'callout',
				props: { type: 'info' },
				selfClosing: false,
				children: [{ type: 'prose', content: 'Live ' }],
			},
		])
	})

	it('seeking matches sequential playback and final replay matches normal parsing', async () => {
		const content = '{% callout %}Hi{% /callout %}'
		let sequential: ReplayResponse | undefined
		for (let through = 0; through <= 16; through++) sequential = await replay(content, through)
		await replay(content, content.length)
		expect(await replay(content, 16)).toEqual(sequential)
		const reset = await replay(content, 0)
		expect(reset).toMatchObject({ nodes: [], through: 0, final: false })
		const final = await replay(content, content.length)
		const complete = (await (await post('parse', { content })).json()) as ParseResponse
		expect(final).toMatchObject({
			...complete,
			through: content.length,
			total: content.length,
			final: true,
		})
	})

	it('final flush reports an unclosed body without losing its content', async () => {
		const content = '{% callout %}Body'
		const data = await replay(content, content.length)
		expect(data.final).toBe(true)
		expect(data.meta.isComplete).toBe(true)
		expect(data.meta.openTags).toBeUndefined()
		expect(data.meta.errors).toEqual([
			expect.objectContaining({ code: 'unclosed', tagName: 'callout' }),
		])
		expect(data.nodes[0]).toMatchObject({ children: [{ type: 'prose', content: 'Body' }] })
	})

	it('preserves whitespace and Unicode across one-character chunks', async () => {
		const content = '  Héllo 🌍\n\n{% button action="go" label="你好" /%}\n  '
		const final = await replay(content, content.length)
		const complete = (await (await post('parse', { content })).json()) as ParseResponse
		expect(final.nodes).toEqual(complete.nodes)
		expect(final.meta.errors).toEqual([])
	})

	it('exposes configured unknown-tag warnings without dropping the source', async () => {
		const content = '{% nope /%}'
		const data = await replay(content, content.length)
		expect(data.meta.errors).toEqual([
			expect.objectContaining({ code: 'unknown_tag', tagName: 'nope' }),
		])
		expect(data.nodes).toEqual([{ type: 'prose', content }])
	})

	it.each([
		null,
		{},
		{ content: 5 },
		{ content: '', chunkSize: 'oops' },
		{ content: '', chunkSize: 0 },
		{ content: '', chunkSize: 257 },
		{ content: '', chunkSize: 1.5 },
		{ content: '', chunkSize: null },
		{ content: '', through: -1 },
		{ content: '', through: 'oops' },
		{ content: '', through: 1.5 },
		{ content: '', through: null },
	])('rejects malformed replay payload %j', async (body) => {
		const response = await post('replay', body)
		expect(response.status).toBe(400)
		expect(await response.json()).toHaveProperty('error')
	})

	it('uses default replay settings, flushes empty input, and clamps seeks past the end', async () => {
		const defaults = (await (await post('replay', { content: 'hello' })).json()) as ReplayResponse
		expect(defaults).toMatchObject({ nodes: [], total: 2, through: 0, final: false })
		const empty = await replay('', 0)
		expect(empty).toMatchObject({ nodes: [], total: 0, through: 0, final: true })
		expect(empty.meta.isComplete).toBe(true)
		expect(await replay('hello', 100, 4)).toMatchObject({ total: 2, through: 2, final: true })
	})

	it.each(['parse', 'replay'])(
		'rejects malformed JSON and oversized HTTP bodies on %s',
		async (endpoint) => {
			const invalid = await fetch(`${url}/api/${endpoint}`, { method: 'POST', body: '{' })
			expect(invalid.status).toBe(400)
			expect(await invalid.json()).toHaveProperty('error')
			const oversized = await post(endpoint, { content: 'x'.repeat(1024 * 1024) })
			expect(oversized.status).toBe(413)
			expect(await oversized.json()).toEqual({ error: 'Request body too large (max 1MB)' })
		},
	)

	it('decodes UTF-8 once, even when HTTP chunks split inside a multibyte character', async () => {
		const payload = Buffer.from(JSON.stringify({ content: '🌍' }))
		const split = payload.indexOf(Buffer.from('🌍')) + 1
		const parsed = await new Promise<ParseResponse>((resolve, reject) => {
			const req = http.request(`${url}/api/parse`, { method: 'POST' }, (res) => {
				let body = ''
				res.setEncoding('utf8')
				res.on('data', (chunk: string) => {
					body += chunk
				})
				res.on('end', () => {
					resolve(JSON.parse(body) as ParseResponse)
				})
				res.on('error', reject)
			})
			req.on('error', reject)
			req.write(payload.subarray(0, split))
			setTimeout(() => req.end(payload.subarray(split)), 30)
		})
		expect(parsed.nodes).toEqual([{ type: 'prose', content: '🌍' }])
	})

	it('bounds replay text and chunk count while leaving normal parsing available', async () => {
		const tooLong = await post('replay', { content: 'x'.repeat(16_385), chunkSize: 256 })
		expect(tooLong.status).toBe(400)
		const tooMany = await post('replay', { content: 'x'.repeat(2049), chunkSize: 1 })
		expect(tooMany.status).toBe(400)
		const allowed = await replay('x'.repeat(2048), 0)
		expect(allowed.total).toBe(2048)
		const normal = await post('parse', { content: 'x'.repeat(16_385) })
		expect(normal.status).toBe(200)
	})
})
