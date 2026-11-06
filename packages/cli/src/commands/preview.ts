import http from 'node:http'
import type { ASTNode } from '@mdocui/core'
import { StreamingParser } from '@mdocui/core'
import { loadConfig } from '../config'
import { buildHTML } from './preview-page'
import { parseRequestSchema, replayRequestSchema } from './preview-schema'

const MAX_REPLAY_CHUNKS = 2048

export interface PreviewOptions {
	port?: number
}

export async function preview(cwd: string, options?: PreviewOptions): Promise<void> {
	const port = options?.port ?? 4321
	let knownTags: Set<string> | undefined

	try {
		const config = await loadConfig(cwd)
		knownTags = new Set(config.components.map((c) => c.name))
		console.log(`Loaded config with ${knownTags.size} components: ${[...knownTags].join(', ')}`)
	} catch {
		console.log('No config found — all tags treated as known')
	}

	const MAX_BODY_SIZE = 1024 * 1024 // 1MB

	const server = http.createServer((req, res) => {
		if (req.method === 'POST' && (req.url === '/api/parse' || req.url === '/api/replay')) {
			const body: Buffer[] = []
			let size = 0
			let aborted = false
			req.on('data', (chunk: Buffer) => {
				if (aborted) return
				size += chunk.length
				if (size > MAX_BODY_SIZE) {
					aborted = true
					res.writeHead(413, { 'Content-Type': 'application/json' })
					res.end(JSON.stringify({ error: 'Request body too large (max 1MB)' }))
					return
				}
				body.push(chunk)
			})
			req.on('end', () => {
				if (aborted) return
				try {
					const request = JSON.parse(Buffer.concat(body).toString('utf8'))
					const parser = new StreamingParser(
						knownTags ? { knownTags, dropUnknown: false } : undefined,
					)
					if (req.url === '/api/replay') {
						const { content, chunkSize, through: requested } = replayRequestSchema.parse(request)
						const total = Math.ceil(content.length / chunkSize)
						if (total > MAX_REPLAY_CHUNKS) {
							throw new Error(
								'Replay supports at most 2048 chunks; increase chunk size or shorten input.',
							)
						}
						const through = Math.min(total, requested)
						// ponytail: bounded prefix replay is O(n²) across playback; use sessions if larger streams are needed.
						for (let i = 0; i < through; i++) {
							parser.write(content.slice(i * chunkSize, (i + 1) * chunkSize))
						}
						if (through === total) parser.flush()
						res.writeHead(200, { 'Content-Type': 'application/json' })
						res.end(
							JSON.stringify({
								nodes: parser.getSnapshotNodes(),
								meta: parser.getMeta(),
								through,
								total,
								final: through === total,
							}),
						)
						return
					}
					const { content } = parseRequestSchema.parse(request)
					parser.write(content)
					parser.flush()
					const nodes: ASTNode[] = parser.getNodes()
					const meta = parser.getMeta()

					res.writeHead(200, { 'Content-Type': 'application/json' })
					res.end(JSON.stringify({ nodes, meta }))
				} catch (err) {
					res.writeHead(400, { 'Content-Type': 'application/json' })
					res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Invalid request' }))
				}
			})
			return
		}

		if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
			res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
			res.end(buildHTML(knownTags))
			return
		}

		res.writeHead(404, { 'Content-Type': 'text/plain' })
		res.end('Not found')
	})

	server.listen(port, '127.0.0.1', () => {
		console.log(`\nmdocui preview server running at:\n`)
		const address = server.address()
		const listeningPort = address && typeof address === 'object' ? address.port : port
		console.log(`  http://localhost:${listeningPort}\n`)
		console.log('Press Ctrl+C to stop.\n')
	})
}
