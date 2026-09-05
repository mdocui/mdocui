import type { ActionEvent } from '@mdocui/core'
import {
	badge as badgeSpec,
	callout as calloutSpec,
	codeBlock as codeBlockSpec,
	image as imageSpec,
} from '@mdocui/core'
import type { ComponentProps } from '../context'
import { renderVNode } from '../render-vnode'

export function Callout({ props, className, children }: ComponentProps) {
	return renderVNode(calloutSpec({ props, className }), children)
}

export function Badge({ props, className }: ComponentProps) {
	return renderVNode(badgeSpec({ props, className }), null)
}

export function Image({ props, className }: ComponentProps) {
	return renderVNode(imageSpec({ props, className }), null)
}

export function CodeBlock({ props, className }: ComponentProps) {
	return renderVNode(codeBlockSpec({ props, className }), null)
}

export function Link({ props, className, onAction, isStreaming }: ComponentProps) {
	const action = props.action as string
	const label = props.label as string
	const rawUrl = props.url as string | undefined
	const url = rawUrl && /^https?:\/\//i.test(rawUrl) ? rawUrl : undefined

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault()
		if (isStreaming) return

		const event: ActionEvent = {
			type: 'link_click',
			action,
			label,
			tagName: 'link',
			params: url ? { url } : undefined,
		}
		onAction(event)
	}

	return (
		<a
			className={className}
			data-mdocui-link
			href={url ?? '#'}
			onClick={handleClick}
			style={{
				textDecoration: 'underline',
				cursor: 'pointer',
				color: 'inherit',
				outline: 'revert',
			}}
		>
			{label}
		</a>
	)
}
