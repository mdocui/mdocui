import type { CSSProperties, ReactNode } from 'react'
import { useInsertionEffect } from 'react'

const KEYFRAMES_ID = 'mdocui-animate-keyframes'
const ANIMATION_NAME = 'mdocui-fade-in'

let stylesInjected = false

function ensureKeyframes(): void {
	if (stylesInjected) return
	if (typeof document === 'undefined') return
	if (document.getElementById(KEYFRAMES_ID)) {
		stylesInjected = true
		return
	}

	const style = document.createElement('style')
	style.id = KEYFRAMES_ID
	style.textContent = `@keyframes ${ANIMATION_NAME} { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`
	document.head.appendChild(style)
	stylesInjected = true
}

export interface AnimateInProps {
	children: ReactNode
	isStreaming: boolean
}

export function AnimateIn({ children, isStreaming }: AnimateInProps): ReactNode {
	useInsertionEffect(() => {
		if (isStreaming) ensureKeyframes()
	}, [isStreaming])

	if (!isStreaming) {
		return children
	}

	const style: CSSProperties = {
		animation: `${ANIMATION_NAME} 200ms ease-out both`,
	}

	return (
		<div data-mdocui-animate style={style}>
			{children}
		</div>
	)
}
