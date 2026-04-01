import type { ASTNode, ParseMeta } from '@mdocui/core'
import { type ComponentRegistry, StreamingParser } from '@mdocui/core'
import { useCallback, useRef, useState } from 'react'

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
	registryRef.current = registry

	const streamingRef = useRef(false)
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
			if (!streamingRef.current) {
				streamingRef.current = true
				setIsStreaming(true)
			}
			const parser = getParser()
			parser.write(chunk)
			setNodes([...parser.getNodes()])
			setMeta(parser.getMeta())
		},
		[getParser],
	)

	const done = useCallback(() => {
		const parser = getParser()
		parser.flush()
		setNodes([...parser.getNodes()])
		setMeta(parser.getMeta())
		streamingRef.current = false
		setIsStreaming(false)
	}, [getParser])

	const replaceContent = useCallback(
		(content: string, options?: ReplaceContentOptions) => {
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
		parserRef.current?.reset()
		parserRef.current = null
		setNodes([])
		setMeta({ errors: [], nodeCount: 0, isComplete: true })
		streamingRef.current = false
		setIsStreaming(false)
	}, [])

	return { nodes, meta, isStreaming, push, replaceContent, done, reset }
}
