import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

interface MdocUIErrorBoundaryProps {
	componentName?: string
	resetKey?: string
	children: ReactNode
}

interface MdocUIErrorBoundaryState {
	hasError: boolean
	error: Error | null
	prevResetKey?: string
}

export class MdocUIErrorBoundary extends Component<
	MdocUIErrorBoundaryProps,
	MdocUIErrorBoundaryState
> {
	constructor(props: MdocUIErrorBoundaryProps) {
		super(props)
		this.state = { hasError: false, error: null, prevResetKey: props.resetKey }
	}

	static getDerivedStateFromError(error: Error): Partial<MdocUIErrorBoundaryState> {
		return { hasError: true, error }
	}

	static getDerivedStateFromProps(
		props: MdocUIErrorBoundaryProps,
		state: MdocUIErrorBoundaryState,
	): Partial<MdocUIErrorBoundaryState> | null {
		if (state.hasError && props.resetKey !== state.prevResetKey) {
			return { hasError: false, error: null, prevResetKey: props.resetKey }
		}
		if (props.resetKey !== state.prevResetKey) {
			return { prevResetKey: props.resetKey }
		}
		return null
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		const name = this.props.componentName ?? 'unknown'
		console.error(
			`[mdocui] Component <${name}> threw an error during render:`,
			error,
			errorInfo.componentStack,
		)
	}

	render() {
		if (this.state.hasError) {
			const name = this.props.componentName
			return (
				<div
					data-mdocui-error
					style={{
						border: '1px solid currentColor',
						borderRadius: '4px',
						padding: '8px 12px',
						opacity: 0.6,
						fontSize: '0.85em',
						color: 'currentColor',
					}}
				>
					{name ? `Component "${name}" failed to render.` : 'A component failed to render.'}
				</div>
			)
		}

		return this.props.children
	}
}
