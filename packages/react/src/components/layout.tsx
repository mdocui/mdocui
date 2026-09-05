import {
	accordion as accordionSpec,
	card as cardSpec,
	divider as dividerSpec,
	grid as gridSpec,
	stack as stackSpec,
	tab as tabSpec,
} from '@mdocui/core'
import React, { useCallback, useId, useRef, useState } from 'react'
import type { ComponentProps } from '../context'
import { renderVNode } from '../render-vnode'

export function Stack({ props, className, children }: ComponentProps) {
	return renderVNode(stackSpec({ props, className }), children)
}

export function Grid({ props, className, children }: ComponentProps) {
	return renderVNode(gridSpec({ props, className }), children)
}

export function Card({ props, className, children }: ComponentProps) {
	return renderVNode(cardSpec({ props, className }), children)
}

export function Divider({ className }: ComponentProps) {
	return renderVNode(dividerSpec({ props: {}, className }), null)
}

export function Accordion({ props, className, children }: ComponentProps) {
	return renderVNode(accordionSpec({ props, className }), children)
}

export function Tabs({ props, className, children }: ComponentProps) {
	const labels = Array.isArray(props.labels) ? props.labels : []
	const initialActive = (props.active as number) ?? 0
	const [active, setActive] = useState(initialActive)
	const childArray = React.Children.toArray(children)

	const uid = useId()
	const tabsId = `mdocui-tabs-${uid}`
	const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			let next: number
			if (e.key === 'ArrowRight') next = (active + 1) % labels.length
			else if (e.key === 'ArrowLeft') next = (active - 1 + labels.length) % labels.length
			else if (e.key === 'Home') next = 0
			else if (e.key === 'End') next = labels.length - 1
			else return
			e.preventDefault()
			setActive(next)
			tabRefs.current[next]?.focus()
		},
		[active, labels.length],
	)

	const themed = !!className

	return (
		<div className={className} data-mdocui-tabs>
			<div
				role="tablist"
				data-mdocui-tablist
				aria-label={labels.join(', ')}
				aria-orientation="horizontal"
				onKeyDown={handleKeyDown}
				style={
					themed
						? undefined
						: {
								display: 'flex',
								gap: '4px',
								borderBottom: '1px solid color-mix(in srgb, currentColor 20%, transparent)',
							}
				}
			>
				{labels.map((label, i) => (
					<button
						type="button"
						key={label}
						ref={(el) => {
							tabRefs.current[i] = el
						}}
						id={`${tabsId}-tab-${i}`}
						role="tab"
						data-mdocui-tab-button
						aria-selected={i === active}
						aria-controls={`${tabsId}-panel-${i}`}
						tabIndex={i === active ? 0 : -1}
						onClick={() => setActive(i)}
						style={
							themed
								? undefined
								: {
										padding: '8px 16px',
										background: 'none',
										border: 'none',
										borderBottom: i === active ? '2px solid currentColor' : '2px solid transparent',
										cursor: 'pointer',
										fontWeight: i === active ? 600 : 400,
										color: 'inherit',
										outline: 'revert',
									}
						}
					>
						{label}
					</button>
				))}
			</div>
			<div
				id={`${tabsId}-panel-${active}`}
				role="tabpanel"
				data-mdocui-tabpanel
				aria-labelledby={`${tabsId}-tab-${active}`}
				style={themed ? undefined : { paddingTop: '8px' }}
			>
				{childArray[active] ?? childArray[0]}
			</div>
		</div>
	)
}

export function Tab({ props, className, children }: ComponentProps) {
	return renderVNode(tabSpec({ props, className }), children)
}
