import type { ActionEvent } from '@mdocui/core'
import { badge as badgeSpec, callout as calloutSpec } from '@mdocui/core'
import type { ComponentProps } from '../context'
import { renderVNode } from '../render-vnode'

export function Callout({ props, className, children }: ComponentProps) {
	return renderVNode(calloutSpec({ props, className }), children)
}

export function Badge({ props, className }: ComponentProps) {
	return renderVNode(badgeSpec({ props, className }), null)
}

export function Image({ props, className }: ComponentProps) {
	const rawSrc = props.src as string
	const src = rawSrc && !/^(javascript|data):/i.test(rawSrc) ? rawSrc : undefined
	const alt = props.alt as string
	const width = props.width as number | undefined
	const height = props.height as number | undefined

	return (
		<img
			className={className}
			data-mdocui-image
			src={src}
			alt={alt}
			width={width}
			height={height}
			style={{ maxWidth: '100%', borderRadius: '6px' }}
		/>
	)
}

export function CodeBlock({ props, className }: ComponentProps) {
	const code = props.code as string
	const language = props.language as string | undefined
	const title = props.title as string | undefined

	return (
		<div className={className} data-mdocui-code-block>
			{title && (
				<div
					style={{
						padding: '6px 12px',
						fontSize: '12px',
						opacity: 0.6,
						borderBottom: '1px solid currentColor',
					}}
				>
					{title}
				</div>
			)}
			<pre style={{ margin: 0, padding: '12px', overflow: 'auto', fontSize: '13px' }}>
				<code data-language={language}>{code}</code>
			</pre>
		</div>
	)
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
