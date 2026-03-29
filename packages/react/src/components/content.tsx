import type { ActionEvent } from '@mdocui/core'
import type { ComponentProps } from '../context'

export function Callout({ props, className, children }: ComponentProps) {
	const type = (props.type as string) ?? 'info'
	const title = props.title as string | undefined

	const role = type === 'warning' || type === 'error' ? 'alert' : 'status'

	return (
		<div
			className={className}
			data-mdocui-callout
			data-type={type}
			role={role}
			style={{
				padding: '12px 16px',
				borderLeft: '4px solid currentColor',
				borderRadius: '0 6px 6px 0',
				opacity: 0.9,
			}}
		>
			{title && <div style={{ fontWeight: 600, marginBottom: '4px' }}>{title}</div>}
			<div>{children}</div>
		</div>
	)
}

export function Badge({ props, className }: ComponentProps) {
	const label = props.label as string
	const variant = (props.variant as string) ?? 'default'

	return (
		<span
			className={className}
			data-mdocui-badge
			data-variant={variant}
			style={{
				display: 'inline-block',
				padding: '2px 8px',
				borderRadius: '9999px',
				fontSize: '12px',
				fontWeight: 500,
				border: '1px solid currentColor',
				opacity: 0.8,
			}}
		>
			{label}
		</span>
	)
}

export function Image({ props, className }: ComponentProps) {
	const src = props.src as string
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
