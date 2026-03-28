import React, { useState } from 'react'
import type { ComponentProps } from '../context'

export function Stack({ props, className, children }: ComponentProps) {
	const direction = (props.direction as string) ?? 'vertical'
	const gap = (props.gap as string) ?? 'md'
	const align = (props.align as string) ?? 'stretch'

	return (
		<div
			className={className}
			data-mdocui-stack
			data-direction={direction}
			data-gap={gap}
			data-align={align}
			style={{
				display: 'flex',
				flexDirection: direction === 'horizontal' ? 'row' : 'column',
				gap: gapValue(gap),
				alignItems: alignValue(align),
			}}
		>
			{children}
		</div>
	)
}

export function Grid({ props, className, children }: ComponentProps) {
	const cols = (props.cols as number) ?? 2
	const gap = (props.gap as string) ?? 'md'

	return (
		<div
			className={className}
			data-mdocui-grid
			style={{
				display: 'grid',
				gridTemplateColumns: `repeat(${cols}, 1fr)`,
				gap: gapValue(gap),
			}}
		>
			{children}
		</div>
	)
}

export function Card({ props, className, children }: ComponentProps) {
	const title = props.title as string | undefined

	return (
		<div
			className={className}
			data-mdocui-card
			data-variant={(props.variant as string) ?? 'default'}
			style={{
				border: '1px solid currentColor',
				borderRadius: '8px',
				padding: '16px',
				opacity: 0.8,
			}}
		>
			{title && (
				<div data-mdocui-card-title style={{ fontWeight: 600, marginBottom: '8px' }}>
					{title}
				</div>
			)}
			<div data-mdocui-card-body>{children}</div>
		</div>
	)
}

export function Divider({ className }: ComponentProps) {
	return (
		<hr
			className={className}
			data-mdocui-divider
			style={{ border: 'none', borderTop: '1px solid currentColor', margin: '8px 0', opacity: 0.2 }}
		/>
	)
}

export function Accordion({ props, className, children }: ComponentProps) {
	const title = props.title as string
	const open = (props.open as boolean) ?? false

	return (
		<details className={className} data-mdocui-accordion open={open || undefined}>
			<summary style={{ cursor: 'pointer', fontWeight: 500 }}>{title}</summary>
			<div style={{ paddingTop: '8px' }}>{children}</div>
		</details>
	)
}

export function Tabs({ props, className, children }: ComponentProps) {
	const labels = Array.isArray(props.labels) ? props.labels : []
	const initialActive = (props.active as number) ?? 0
	const [active, setActive] = useState(initialActive)
	const childArray = React.Children.toArray(children)

	return (
		<div className={className} data-mdocui-tabs>
			<div
				role="tablist"
				style={{
					display: 'flex',
					gap: '4px',
					borderBottom: '1px solid currentColor',
					opacity: 0.2,
				}}
			>
				{labels.map((label, i) => (
					<button
						type="button"
						key={`${i}-${label}`}
						role="tab"
						aria-selected={i === active}
						onClick={() => setActive(i)}
						style={{
							padding: '8px 16px',
							background: 'none',
							border: 'none',
							borderBottom: i === active ? '2px solid currentColor' : '2px solid transparent',
							cursor: 'pointer',
							fontWeight: i === active ? 600 : 400,
							color: 'inherit',
						}}
					>
						{label}
					</button>
				))}
			</div>
			<div role="tabpanel" style={{ paddingTop: '8px' }}>
				{childArray[active] ?? childArray[0]}
			</div>
		</div>
	)
}

export function Tab({ props, className, children }: ComponentProps) {
	return (
		<div className={className} data-mdocui-tab data-label={props.label as string}>
			{children}
		</div>
	)
}

function gapValue(gap: string): string {
	switch (gap) {
		case 'none':
			return '0'
		case 'sm':
			return '4px'
		case 'lg':
			return '24px'
		default:
			return '12px'
	}
}

function alignValue(align: string): string {
	switch (align) {
		case 'start':
			return 'flex-start'
		case 'center':
			return 'center'
		case 'end':
			return 'flex-end'
		default:
			return 'stretch'
	}
}
