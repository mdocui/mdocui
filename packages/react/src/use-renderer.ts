import type { ASTNode, ParseMeta } from '@mdocui/core'
import { type ComponentRegistry, StreamingParser } from '@mdocui/core'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseRendererOptions {
	registry: ComponentRegistry
}

export interface ReplaceContentOptions {
	/**
	 * Keep streaming state so shimmer/pendingTag render.
	 * You MUST call done() when the stream ends, or reset() on unmount,
	 * otherwise isStreaming will remain true indefinitely.
	 */
	streaming?: boolean
}

export interface UseRendererReturn {
	nodes: ASTNode[]
	meta: ParseMeta
	isStreaming: boolean
	push: (chunk: string) => void
	replaceContent: (content: string, options?: ReplaceContentOptions) => void
	done: () => void
	reset: () => void
}

export function useRenderer({ registry }: UseRendererOptions): UseRendererReturn {
	const parserRef = useRef<StreamingParser | null>(null)
	const registryRef = useRef(registry)
	// NOTE: registry is captured once at parser creation time. If registry changes
	// after the first push(), call reset() first to pick up the new tag definitions.
	registryRef.current = registry

	const streamingRef = useRef(false)
	const doneRef = useRef(false)
	const rafRef = useRef<number | null>(null)

	const [nodes, setNodes] = useState<ASTNode[]>([])
	const [meta, setMeta] = useState<ParseMeta>({ errors: [], nodeCount: 0, isComplete: true })
	const [isStreaming, setIsStreaming] = useState(false)

	const getParser = useCallback(() => {
		if (!parserRef.current) {
			parserRef.current = new StreamingParser({
				knownTags: registryRef.current.knownTags(),
			})
		}
		return parserRef.current
	}, [])

	const push = useCallback(
		(chunk: string) => {
			if (doneRef.current) return
			if (!streamingRef.current) {
				streamingRef.current = true
				setIsStreaming(true)
			}
			getParser().write(chunk)

			// Schedule a render for the next frame if one isn't already pending.
			// This guarantees at most one React update per frame (~60fps) regardless
			// of how fast tokens arrive, while always rendering the latest parser state.
			if (rafRef.current === null) {
				rafRef.current = requestAnimationFrame(() => {
					rafRef.current = null
					const current = parserRef.current
					if (!current) return
					setNodes([...current.getNodes()])
					setMeta(current.getMeta())
				})
			}
		},
		[getParser],
	)

	const done = useCallback(() => {
		if (rafRef.current !== null) {
			cancelAnimationFrame(rafRef.current)
			rafRef.current = null
		}
		const parser = getParser()
		parser.flush()
		setNodes([...parser.getNodes()])
		setMeta(parser.getMeta())
		streamingRef.current = false
		doneRef.current = true
		setIsStreaming(false)
	}, [getParser])

	const replaceContent = useCallback(
		(content: string, options?: ReplaceContentOptions) => {
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current)
				rafRef.current = null
			}
			doneRef.current = false
			parserRef.current?.reset()
			parserRef.current = null
			const parser = getParser()
			parser.write(content)
			if (options?.streaming) {
				if (!streamingRef.current) {
					streamingRef.current = true
					setIsStreaming(true)
				}
			} else {
				parser.flush()
				streamingRef.current = false
				setIsStreaming(false)
			}
			setNodes([...parser.getNodes()])
			setMeta(parser.getMeta())
		},
		[getParser],
	)

	const reset = useCallback(() => {
		if (rafRef.current !== null) {
			cancelAnimationFrame(rafRef.current)
			rafRef.current = null
		}
		doneRef.current = false
		parserRef.current?.reset()
		parserRef.current = null
		setNodes([])
		setMeta({ errors: [], nodeCount: 0, isComplete: true })
		streamingRef.current = false
		setIsStreaming(false)
	}, [])

	useEffect(() => {
		return () => {
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
		}
	}, [])

	return { nodes, meta, isStreaming, push, replaceContent, done, reset }
}
