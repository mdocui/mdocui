import React, { useState } from 'react'
import type { ComponentProps } from '../context'

export function Stack({ props, children }: ComponentProps) {
	const direction = (props.direction as string) ?? 'vertical'
	const gap = (props.gap as string) ?? 'md'
	const align = (props.align as string) ?? 'stretch'

	return (
		<div
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

export function Grid({ props, children }: ComponentProps) {
	const cols = (props.cols as number) ?? 2
	const gap = (props.gap as string) ?? 'md'

	return (
		<div
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

export function Card({ props, children }: ComponentProps) {
	const title = props.title as string | undefined

	return (
		<div
			data-mdocui-card
			data-variant={(props.variant as string) ?? 'default'}
			style={{ border: '1px solid #27272a', borderRadius: '8px', padding: '16px' }}
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

export function Divider(_: ComponentProps) {
	return (
		<hr
			data-mdocui-divider
			style={{ border: 'none', borderTop: '1px solid #27272a', margin: '8px 0' }}
		/>
	)
}

export function Accordion({ props, children }: ComponentProps) {
	const title = props.title as string
	const open = (props.open as boolean) ?? false

	return (
		<details data-mdocui-accordion open={open || undefined}>
			<summary style={{ cursor: 'pointer', fontWeight: 500 }}>{title}</summary>
			<div style={{ paddingTop: '8px' }}>{children}</div>
		</details>
	)
}

export function Tabs({ props, children }: ComponentProps) {
	const labels = Array.isArray(props.labels) ? props.labels : []
	const initialActive = (props.active as number) ?? 0
	const [active, setActive] = useState(initialActive)
	const childArray = React.Children.toArray(children)

	return (
		<div data-mdocui-tabs>
			<div
				role="tablist"
				style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #27272a' }}
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

export function Tab({ props, children }: ComponentProps) {
	return (
		<div data-mdocui-tab data-label={props.label as string}>
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
