import { h, SLOT, styleUnless, type VElement, type VNode } from '../vnode'

export interface PureArgs {
	props: Record<string, unknown>
	className?: string
}

/** Reject schemes that execute when a URL lands in the DOM. */
export function safeSrc(raw: unknown): string | undefined {
	if (typeof raw !== 'string' || !raw) return undefined
	return /^\s*(javascript|data|vbscript):/i.test(raw) ? undefined : raw
}

export function callout({ props, className }: PureArgs): VElement {
	const type = (props.type as string) ?? 'info'
	const title = props.title as string | undefined
	const role = type === 'warning' || type === 'error' ? 'alert' : 'status'

	const titleNode: VNode = title
		? h('div', { style: { fontWeight: 600, marginBottom: '4px' } }, title)
		: null

	return h(
		'div',
		{
			class: className,
			'data-mdocui-callout': true,
			'data-type': type,
			role,
			style: {
				padding: '12px 16px',
				borderLeft: '4px solid currentColor',
				borderRadius: '0 6px 6px 0',
				opacity: 0.9,
			},
		},
		titleNode,
		h('div', {}, SLOT),
	)
}

export function badge({ props, className }: PureArgs): VElement {
	return h(
		'span',
		{
			class: className,
			'data-mdocui-badge': true,
			'data-variant': (props.variant as string) ?? 'default',
			style: {
				display: 'inline-block',
				padding: '2px 8px',
				borderRadius: '9999px',
				fontSize: '12px',
				fontWeight: 500,
				border: '1px solid currentColor',
				opacity: 0.8,
			},
		},
		props.label as string,
	)
}

export function divider({ className }: PureArgs): VElement {
	return h('hr', {
		class: className,
		'data-mdocui-divider': true,
		style: styleUnless(className, {
			border: 'none',
			borderTop: '1px solid currentColor',
			margin: '8px 0',
			opacity: 0.2,
		}),
	})
}
