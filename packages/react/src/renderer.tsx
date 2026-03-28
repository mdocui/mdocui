import type { ASTNode, ComponentNode, ProseNode } from '@mdocui/core'
import { useMemo } from 'react'
import type { ActionHandler, ComponentMap, RendererContext } from './context'
import { MdocUIProvider } from './context'

export interface RendererProps {
	nodes: ASTNode[]
	components: ComponentMap
	onAction?: ActionHandler
	isStreaming?: boolean
	renderProse?: (content: string, key: string) => React.ReactNode
	classNames?: Record<string, string>
}

export function Renderer({
	nodes,
	components,
	onAction = noop,
	isStreaming = false,
	renderProse,
	classNames,
}: RendererProps) {
	const ctx = useMemo<RendererContext>(
		() => ({ components, onAction, isStreaming }),
		[components, onAction, isStreaming],
	)

	const grouped = groupConsecutiveButtons(nodes)

	return (
		<MdocUIProvider value={ctx}>
			<div data-mdocui style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
				{grouped.map((item, i) => {
					if (item.type === 'button-row') {
						return (
							<div key={`br-${i}`} data-mdocui-button-row style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
								{item.nodes.map((node, j) =>
									renderNode(node, `br-${i}-${j}`, ctx, renderProse, classNames),
								)}
							</div>
						)
					}
					return renderNode(item.node, `n-${i}`, ctx, renderProse, classNames)
				})}
			</div>
		</MdocUIProvider>
	)
}

type GroupedItem =
	| { type: 'node'; node: ASTNode }
	| { type: 'button-row'; nodes: ASTNode[] }

function groupConsecutiveButtons(nodes: ASTNode[]): GroupedItem[] {
	const result: GroupedItem[] = []
	let buttonBuffer: ASTNode[] = []

	const flushButtons = () => {
		if (buttonBuffer.length > 0) {
			result.push({ type: 'button-row', nodes: buttonBuffer })
			buttonBuffer = []
		}
	}

	for (const node of nodes) {
		const isButton =
			node.type === 'component' && node.name === 'button'
		const isEmptyProse =
			node.type === 'prose' && node.content.trim() === ''

		if (isButton) {
			buttonBuffer.push(node)
		} else if (isEmptyProse && buttonBuffer.length > 0) {
			// skip whitespace-only prose between buttons
		} else {
			flushButtons()
			result.push({ type: 'node', node })
		}
	}
	flushButtons()

	return result
}

function renderNode(
	node: ASTNode,
	key: string,
	ctx: RendererContext,
	renderProse?: (content: string, key: string) => React.ReactNode,
	classNames?: Record<string, string>,
): React.ReactNode {
	if (node.type === 'prose') return renderProseNode(node, key, renderProse)
	return renderComponentNode(node, key, ctx, renderProse, classNames)
}

function renderProseNode(
	node: ProseNode,
	key: string,
	renderProse?: (content: string, key: string) => React.ReactNode,
): React.ReactNode {
	if (renderProse) return renderProse(node.content, key)
	return (
		<span key={key} data-mdocui-prose>
			{node.content}
		</span>
	)
}

function renderComponentNode(
	node: ComponentNode,
	key: string,
	ctx: RendererContext,
	renderProse?: (content: string, key: string) => React.ReactNode,
	classNames?: Record<string, string>,
): React.ReactNode {
	const Component = ctx.components[node.name]
	if (!Component) return null

	const children =
		node.children.length > 0
			? node.children.map((child, i) =>
					renderNode(child, `${key}-${i}`, ctx, renderProse, classNames),
				)
			: undefined

	return (
		<Component
			key={key}
			name={node.name}
			props={node.props}
			className={classNames?.[node.name]}
			onAction={ctx.onAction}
			isStreaming={ctx.isStreaming}
		>
			{children}
		</Component>
	)
}

function noop() {}
