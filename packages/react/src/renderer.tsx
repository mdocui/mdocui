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
}

export function Renderer({
	nodes,
	components,
	onAction = noop,
	isStreaming = false,
	renderProse,
}: RendererProps) {
	const ctx = useMemo<RendererContext>(
		() => ({ components, onAction, isStreaming }),
		[components, onAction, isStreaming],
	)

	return (
		<MdocUIProvider value={ctx}>
			<div data-mdocui>{nodes.map((node, i) => renderNode(node, `n-${i}`, ctx, renderProse))}</div>
		</MdocUIProvider>
	)
}

function renderNode(
	node: ASTNode,
	key: string,
	ctx: RendererContext,
	renderProse?: (content: string, key: string) => React.ReactNode,
): React.ReactNode {
	if (node.type === 'prose') return renderProseNode(node, key, renderProse)
	return renderComponentNode(node, key, ctx, renderProse)
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
): React.ReactNode {
	const Component = ctx.components[node.name]
	if (!Component) return null

	const children =
		node.children.length > 0
			? node.children.map((child, i) => renderNode(child, `${key}-${i}`, ctx, renderProse))
			: undefined

	return (
		<Component
			key={key}
			name={node.name}
			props={node.props}
			onAction={ctx.onAction}
			isStreaming={ctx.isStreaming}
		>
			{children}
		</Component>
	)
}

function noop() {}
