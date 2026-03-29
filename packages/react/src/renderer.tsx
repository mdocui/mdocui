import type { ASTNode, ComponentNode, ProseNode } from '@mdocui/core'
import React, { useMemo } from 'react'
import { AnimateIn } from './animations'
import type { ActionHandler, ComponentMap, RendererContext } from './context'
import { MdocUIProvider } from './context'
import { defaultComponents } from './defaults'
import { MdocUIErrorBoundary } from './error-boundary'
import { SimpleMarkdown } from './prose'

export interface RendererProps {
	nodes: ASTNode[]
	components?: ComponentMap
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
	const merged = useMemo<ComponentMap>(
		() => (components ? { ...defaultComponents, ...components } : defaultComponents),
		[components],
	)

	const ctx = useMemo<RendererContext>(
		() => ({ components: merged, onAction, isStreaming }),
		[merged, onAction, isStreaming],
	)

	const grouped = groupConsecutiveButtons(nodes)

	return (
		<MdocUIProvider value={ctx}>
			<div data-mdocui style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
				{grouped.map((item, idx) => {
					if (item.type === 'button-row') {
						return (
							<div
								key={`br-${idx}`}
								data-mdocui-button-row
								style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
							>
								{item.nodes.map((node, j) => {
									const nodeKey = node.type === 'component' ? `btn-${idx}-${j}` : `btn-${idx}-${j}`
									return renderNode(node, nodeKey, ctx, renderProse, classNames)
								})}
							</div>
						)
					}
					const nodeKey =
						item.node.type === 'component'
							? `${item.node.name}-${idx}-${item.node.props.label ?? item.node.props.title ?? ''}`
							: `prose-${idx}`
					return renderNode(item.node, nodeKey, ctx, renderProse, classNames)
				})}
			</div>
		</MdocUIProvider>
	)
}

type GroupedItem = { type: 'node'; node: ASTNode } | { type: 'button-row'; nodes: ASTNode[] }

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
		const isButton = node.type === 'component' && node.name === 'button'
		const isEmptyProse = node.type === 'prose' && node.content.trim() === ''

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
	if (renderProse) {
		return <React.Fragment key={key}>{renderProse(node.content, key)}</React.Fragment>
	}
	return <SimpleMarkdown key={key} content={node.content} dataKey={key} />
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
		<div key={key} style={{ display: 'contents' }}>
			<AnimateIn isStreaming={ctx.isStreaming}>
				<MdocUIErrorBoundary componentName={node.name} resetKey={key}>
					<Component
						name={node.name}
						props={node.props}
						className={classNames?.[node.name]}
						onAction={ctx.onAction}
						isStreaming={ctx.isStreaming}
					>
						{children}
					</Component>
				</MdocUIErrorBoundary>
			</AnimateIn>
		</div>
	)
}

function noop() {}
