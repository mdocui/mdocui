import type { ActionEvent } from '@mdocui/core'
import type { ComponentProps } from '../context'

const calloutColors: Record<string, { bg: string; border: string }> = {
	info: { bg: '#eff6ff', border: '#3b82f6' },
	warning: { bg: '#fffbeb', border: '#f59e0b' },
	error: { bg: '#fef2f2', border: '#ef4444' },
	success: { bg: '#f0fdf4', border: '#22c55e' },
}

export function Callout({ props, children }: ComponentProps) {
	const type = (props.type as string) ?? 'info'
	const title = props.title as string | undefined
	const colors = calloutColors[type] ?? calloutColors.info

	return (
		<div
			data-mdocui-callout
			data-type={type}
			role="alert"
			style={{
				padding: '12px 16px',
				borderLeft: `4px solid ${colors.border}`,
				background: colors.bg,
				borderRadius: '0 6px 6px 0',
			}}
		>
			{title && <div style={{ fontWeight: 600, marginBottom: '4px' }}>{title}</div>}
			<div>{children}</div>
		</div>
	)
}

const badgeColors: Record<string, { bg: string; color: string }> = {
	default: { bg: '#f1f5f9', color: '#475569' },
	success: { bg: '#dcfce7', color: '#166534' },
	warning: { bg: '#fef3c7', color: '#92400e' },
	error: { bg: '#fee2e2', color: '#991b1b' },
	info: { bg: '#dbeafe', color: '#1e40af' },
}

export function Badge({ props }: ComponentProps) {
	const label = props.label as string
	const variant = (props.variant as string) ?? 'default'
	const colors = badgeColors[variant] ?? badgeColors.default

	return (
		<span
			data-mdocui-badge
			data-variant={variant}
			style={{
				display: 'inline-block',
				padding: '2px 8px',
				borderRadius: '9999px',
				fontSize: '12px',
				fontWeight: 500,
				background: colors.bg,
				color: colors.color,
			}}
		>
			{label}
		</span>
	)
}

export function Image({ props }: ComponentProps) {
	const src = props.src as string
	const alt = props.alt as string
	const width = props.width as number | undefined
	const height = props.height as number | undefined

	return (
		<img
			data-mdocui-image
			src={src}
			alt={alt}
			width={width}
			height={height}
			style={{ maxWidth: '100%', borderRadius: '6px' }}
		/>
	)
}

export function CodeBlock({ props }: ComponentProps) {
	const code = props.code as string
	const language = props.language as string | undefined
	const title = props.title as string | undefined

	return (
		<div data-mdocui-code-block>
			{title && (
				<div
					style={{
						padding: '6px 12px',
						background: '#1e293b',
						color: '#94a3b8',
						fontSize: '12px',
						borderRadius: '6px 6px 0 0',
					}}
				>
					{title}
				</div>
			)}
			<pre
				style={{
					margin: 0,
					padding: '12px',
					background: '#0f172a',
					color: '#e2e8f0',
					borderRadius: title ? '0 0 6px 6px' : '6px',
					overflow: 'auto',
					fontSize: '13px',
				}}
			>
				<code data-language={language}>{code}</code>
			</pre>
		</div>
	)
}

export function Link({ props, onAction, isStreaming }: ComponentProps) {
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
			data-mdocui-link
			href={url ?? '#'}
			onClick={handleClick}
			style={{ color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer' }}
		>
			{label}
		</a>
	)
}
