import { h, SLOT, styleUnless, type VElement, type VNode } from '../vnode'
import type { PureArgs } from './content'

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

export function stack({ props, className }: PureArgs): VElement {
	const direction = (props.direction as string) ?? 'vertical'
	const gap = (props.gap as string) ?? 'md'
	const align = (props.align as string) ?? 'stretch'

	return h(
		'div',
		{
			class: className,
			'data-mdocui-stack': true,
			'data-direction': direction,
			'data-gap': gap,
			'data-align': align,
			style: styleUnless(className, {
				display: 'flex',
				flexDirection: direction === 'horizontal' ? 'row' : 'column',
				gap: gapValue(gap),
				alignItems: alignValue(align),
			}),
		},
		SLOT,
	)
}

export function grid({ props, className }: PureArgs): VElement {
	const cols = (props.cols as number) ?? 2
	const gap = (props.gap as string) ?? 'md'

	return h(
		'div',
		{
			class: className,
			'data-mdocui-grid': true,
			'data-cols': cols,
			style: styleUnless(className, {
				display: 'grid',
				gridTemplateColumns: `repeat(${cols}, 1fr)`,
				gap: gapValue(gap),
			}),
		},
		SLOT,
	)
}

export function card({ props, className }: PureArgs): VElement {
	const title = props.title as string | undefined
	const titleNode: VNode = title
		? h(
				'div',
				{
					'data-mdocui-card-title': true,
					style: styleUnless(className, { fontWeight: 600, marginBottom: '8px' }),
				},
				title,
			)
		: null

	return h(
		'div',
		{
			class: className,
			'data-mdocui-card': true,
			'data-variant': (props.variant as string) ?? 'default',
			style: styleUnless(className, {
				border: '1px solid currentColor',
				borderRadius: '8px',
				padding: '16px',
				opacity: 0.8,
			}),
		},
		titleNode,
		h('div', { 'data-mdocui-card-body': true }, SLOT),
	)
}

export function accordion({ props, className }: PureArgs): VElement {
	const open = (props.open as boolean) ?? false

	return h(
		'details',
		{ class: className, 'data-mdocui-accordion': true, open: open || undefined },
		h(
			'summary',
			{
				'data-mdocui-accordion-summary': true,
				style: styleUnless(className, { cursor: 'pointer', fontWeight: 500 }),
			},
			props.title as string,
		),
		h(
			'div',
			{
				'data-mdocui-accordion-body': true,
				style: styleUnless(className, { paddingTop: '8px' }),
			},
			SLOT,
		),
	)
}

export function tab({ props, className }: PureArgs): VElement {
	return h(
		'div',
		{ class: className, 'data-mdocui-tab': true, 'data-label': props.label as string },
		SLOT,
	)
}

export function buttonGroup({ props, className }: PureArgs): VElement {
	const direction = (props.direction as string) ?? 'horizontal'

	return h(
		'div',
		{
			class: className,
			'data-mdocui-button-group': true,
			'data-direction': direction,
			role: 'group',
			'aria-label': (props.label as string) ?? undefined,
			style: styleUnless(className, {
				display: 'flex',
				flexDirection: direction === 'vertical' ? 'column' : 'row',
				gap: '8px',
			}),
		},
		SLOT,
	)
}
