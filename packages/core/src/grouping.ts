import type { ASTNode } from './types'

export type GroupedItem = { type: 'node'; node: ASTNode } | { type: 'button-row'; nodes: ASTNode[] }

/**
 * Collapse runs of top-level buttons into one row.
 *
 * Models tend to close a response with two or three buttons, which read as a
 * row of choices rather than a stack. Blank prose between them is ignored so
 * the run survives the newlines a model puts there.
 */
export function groupButtons(nodes: ASTNode[]): GroupedItem[] {
	const result: GroupedItem[] = []
	let buffer: ASTNode[] = []

	const flush = () => {
		if (buffer.length > 0) {
			result.push({ type: 'button-row', nodes: buffer })
			buffer = []
		}
	}

	for (const node of nodes) {
		const isButton = node.type === 'component' && node.name === 'button'
		const isBlankProse = node.type === 'prose' && node.content.trim() === ''

		if (isButton) {
			buffer.push(node)
		} else if (isBlankProse && buffer.length > 0) {
			// keep the run going across the newlines between buttons
		} else {
			flush()
			result.push({ type: 'node', node })
		}
	}
	flush()

	return result
}
