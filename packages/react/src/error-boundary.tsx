import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'
import type { ComponentErrorEvent } from './context'

const NO_SNAPSHOT = Symbol('no-snapshot')

// Inner boundary: if the stored lastValidChildren snapshot also throws,
// catch it here and show the fallback div. Without this, the outer boundary
// would re-catch the error, schedule another render, get the same throw,
// and loop until React's internal retry limit is hit.
interface LastValidAttemptProps {
	children: ReactNode
	fallback: ReactNode
}
class LastValidAttemptBoundary extends Component<LastValidAttemptProps, { failed: boolean }> {
	constructor(props: LastValidAttemptProps) {
		super(props)
		this.state = { failed: false }
	}
	static getDerivedStateFromError(): { failed: boolean } {
		return { failed: true }
	}
	componentDidCatch(error: Error): void {
		console.warn('[mdocui] Last-valid snapshot also threw; showing error fallback instead.', error)
	}
	render() {
		return this.state.failed ? this.props.fallback : this.props.children
	}
}

interface MdocUIErrorBoundaryProps {
	componentName?: string
	resetKey?: string
	children: ReactNode
	onError?: (event: ComponentErrorEvent) => void
	componentProps?: Record<string, unknown>
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
	private lastValidChildren: ReactNode | typeof NO_SNAPSHOT = NO_SNAPSHOT

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

	componentDidMount(): void {
		if (!this.state.hasError && this.props.children != null) {
			this.lastValidChildren = this.props.children
		}
	}

	componentDidUpdate(
		_prevProps: MdocUIErrorBoundaryProps,
		prevState: MdocUIErrorBoundaryState,
	): void {
		if (prevState.hasError && !this.state.hasError) {
			this.lastValidChildren = NO_SNAPSHOT
		}
		if (!this.state.hasError && this.props.children != null) {
			this.lastValidChildren = this.props.children
		}
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		const name = this.props.componentName ?? 'unknown'
		console.error(
			`[mdocui] Component <${name}> threw an error during render:`,
			error,
			errorInfo.componentStack ?? '',
		)
		this.props.onError?.({
			componentName: name,
			error,
			props: this.props.componentProps ?? {},
		})
	}

	render() {
		if (this.state.hasError) {
			const name = this.props.componentName
			const fallback = (
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
			if (this.lastValidChildren !== NO_SNAPSHOT) {
				// key ensures the inner boundary remounts on each reset cycle.
				return (
					<LastValidAttemptBoundary key={this.props.resetKey ?? ''} fallback={fallback}>
						{this.lastValidChildren}
					</LastValidAttemptBoundary>
				)
			}
			return fallback
		}

		return this.props.children
	}
}
