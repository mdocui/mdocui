import type { CSSProperties } from 'react'
import { useInsertionEffect } from 'react'

const SHIMMER_KEYFRAMES_ID = 'mdocui-shimmer-keyframes'

function ensureShimmerKeyframes(): void {
	if (typeof document === 'undefined') return
	if (document.getElementById(SHIMMER_KEYFRAMES_ID)) return

	const style = document.createElement('style')
	style.id = SHIMMER_KEYFRAMES_ID
	style.textContent = `@keyframes mdocui-shimmer { 0% { opacity: 0.15; } 50% { opacity: 0.35; } 100% { opacity: 0.15; } }`
	document.head.appendChild(style)
}

export interface ComponentShimmerProps {
	pendingTag?: string
}

export function ComponentShimmer({ pendingTag }: ComponentShimmerProps) {
	useInsertionEffect(() => {
		ensureShimmerKeyframes()
	}, [])

	const barStyle: CSSProperties = {
		height: '12px',
		borderRadius: '6px',
		background: 'currentColor',
		animation: 'mdocui-shimmer 1.5s ease-in-out infinite',
	}

	return (
		<div
			data-mdocui-shimmer
			data-pending-tag={pendingTag}
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: '10px',
				padding: '16px',
				borderRadius: '8px',
				border: '1px solid currentColor',
				opacity: 0.2,
			}}
		>
			<div style={{ ...barStyle, width: '40%' }} />
			<div style={{ ...barStyle, width: '80%' }} />
			<div style={{ ...barStyle, width: '60%' }} />
		</div>
	)
}
