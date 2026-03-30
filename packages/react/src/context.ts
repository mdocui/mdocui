import type { ActionEvent, ComponentRegistry } from '@mdocui/core'
import { createContext, useContext } from 'react'

export type ActionHandler = (event: ActionEvent) => void
export type ComponentMap = Record<string, React.ComponentType<ComponentProps>>

export interface ComponentProps {
	name: string
	props: Record<string, unknown>
	children?: React.ReactNode
	className?: string
	onAction: ActionHandler
	isStreaming: boolean
}

export interface RendererContext {
	components: ComponentMap
	onAction: ActionHandler
	isStreaming: boolean
	registry?: ComponentRegistry
	contextData?: Record<string, unknown>
}

const MdocUIContext = createContext<RendererContext | null>(null)

export const MdocUIProvider = MdocUIContext.Provider

export function useMdocUI(): RendererContext {
	const ctx = useContext(MdocUIContext)
	if (!ctx) throw new Error('useMdocUI must be used inside <Renderer />')
	return ctx
}
