import { h, styleUnless, type VElement, type VNode } from '../vnode'
import type { PureArgs } from './content'

// A chart is data, but role="img" exposes only its label — so the label has to
// carry the data. Long series are summarised rather than read out in full.
const MAX_SPOKEN_POINTS = 12

export function describeChart(
	type: string,
	labels: unknown[],
	values: number[],
	title: string | undefined,
): string {
	const prefix = title ? `${title} — ` : ''
	if (values.length === 0) return `${prefix}${type} chart`

	// Values reach here unvalidated when the registry runs in coerce mode, so a
	// non-numeric prop can land as NaN. Skip those rather than speak them.
	const finite = values.filter((v) => Number.isFinite(v))
	const count = `${values.length} data point${values.length === 1 ? '' : 's'}`
	if (finite.length === 0) return `${prefix}${type} chart, ${count}`

	if (values.length > MAX_SPOKEN_POINTS) {
		const min = finite.reduce((a, b) => Math.min(a, b), finite[0])
		const max = finite.reduce((a, b) => Math.max(a, b), finite[0])
		return `${prefix}${type} chart, ${count}, values from ${min} to ${max}`
	}

	const pairs = values.flatMap((v, i) => {
		if (!Number.isFinite(v)) return []
		const label = labels[i]
		return [label === undefined ? String(v) : `${String(label)} ${v}`]
	})
	return `${prefix}${type} chart, ${count}: ${pairs.join(', ')}`
}

export function chart({ props, className }: PureArgs): VElement {
	const type = props.type as string
	const labels = Array.isArray(props.labels) ? props.labels : []
	const values = Array.isArray(props.values) ? (props.values as number[]).map(Number) : []
	const title = props.title as string | undefined
	const max = values.reduce((a, b) => Math.max(a, b), 1)
	const themed = !!className

	const titleNode: VNode = title
		? h(
				'div',
				{
					'data-mdocui-chart-title': true,
					style: styleUnless(className, { fontWeight: 600, marginBottom: '12px' }),
				},
				title,
			)
		: null

	const bars: VNode =
		type === 'bar' || type === 'line'
			? h(
					'div',
					{
						'data-mdocui-chart-bars': true,
						style: {
							display: 'flex',
							alignItems: 'flex-end',
							gap: themed ? undefined : '6px',
							height: themed ? undefined : '140px',
						},
					},
					...values.map((val, i) =>
						h(
							'div',
							{
								'data-mdocui-chart-col': true,
								style: {
									flex: 1,
									textAlign: 'center',
									display: 'flex',
									flexDirection: 'column',
									justifyContent: 'flex-end',
									height: '100%',
								},
							},
							h(
								'div',
								{
									'data-mdocui-chart-value': true,
									style: styleUnless(className, {
										fontSize: '11px',
										opacity: 0.6,
										marginBottom: '4px',
									}),
								},
								val,
							),
							h('div', {
								'data-mdocui-chart-bar': true,
								style: {
									height: `${Math.max((val / max) * 100, 4)}%`,
									background: 'currentColor',
									...(themed ? {} : { borderRadius: '4px 4px 0 0', minHeight: '4px' }),
								},
							}),
							h(
								'div',
								{
									'data-mdocui-chart-label': true,
									style: styleUnless(className, {
										fontSize: '11px',
										marginTop: '6px',
										opacity: 0.5,
									}),
								},
								labels[i] as string,
							),
						),
					),
				)
			: null

	const legend: VNode =
		type === 'pie' || type === 'donut'
			? h(
					'div',
					{
						'data-mdocui-chart-legend': true,
						style: { display: 'flex', gap: themed ? undefined : '12px', flexWrap: 'wrap' },
					},
					...labels.map((label, i) => {
						const total = values.reduce((a, b) => a + b, 0)
						const pct = total > 0 ? Math.round((values[i] / total) * 100) : 0
						return h(
							'span',
							{
								'data-mdocui-chart-legend-item': true,
								style: styleUnless(className, { fontSize: '13px' }),
							},
							`${String(label)}: ${values[i]} (${pct}%)`,
						)
					}),
				)
			: null

	return h(
		'div',
		{
			class: className,
			'data-mdocui-chart': true,
			'data-type': type,
			role: 'img',
			'aria-label': describeChart(type, labels, values, title),
			style: styleUnless(className, { padding: '12px 0' }),
		},
		titleNode,
		bars,
		legend,
	)
}

export function table({ props, className }: PureArgs): VElement {
	const headers = Array.isArray(props.headers) ? props.headers : []
	const rows = Array.isArray(props.rows) ? props.rows : []
	const caption = props.caption as string | undefined

	const captionNode: VNode = caption
		? h(
				'caption',
				{
					'data-mdocui-table-caption': true,
					style: styleUnless(className, {
						textAlign: 'left',
						fontWeight: 600,
						marginBottom: '8px',
					}),
				},
				caption,
			)
		: null

	return h(
		'table',
		{
			class: className,
			'data-mdocui-table': true,
			style: styleUnless(className, { width: '100%', borderCollapse: 'collapse' }),
		},
		captionNode,
		h(
			'thead',
			{},
			h(
				'tr',
				{},
				...headers.map((header) =>
					h(
						'th',
						{
							scope: 'col',
							style: styleUnless(className, {
								textAlign: 'left',
								padding: '8px',
								borderBottom: '2px solid currentColor',
								fontWeight: 600,
								opacity: 0.7,
								fontSize: '13px',
							}),
						},
						header as string,
					),
				),
			),
		),
		h(
			'tbody',
			{},
			...rows.map((row) => {
				const cells = Array.isArray(row) ? row : [String(row)]
				return h(
					'tr',
					{},
					...cells.map((cell) =>
						h(
							'td',
							{
								style: styleUnless(className, {
									padding: '8px',
									borderBottom: '1px solid currentColor',
									opacity: 0.8,
								}),
							},
							cell as string,
						),
					),
				)
			}),
		),
	)
}

export function stat({ props, className }: PureArgs): VElement {
	const change = props.change as string | undefined
	const changeNode: VNode = change
		? h(
				'div',
				{
					'data-mdocui-stat-change': true,
					style: styleUnless(className, { fontSize: '13px' }),
				},
				change,
			)
		: null

	return h(
		'div',
		{
			class: className,
			'data-mdocui-stat': true,
			'data-trend': (props.trend as string) ?? 'neutral',
			style: styleUnless(className, { padding: '8px 0' }),
		},
		h(
			'div',
			{
				'data-mdocui-stat-label': true,
				style: styleUnless(className, { fontSize: '13px', opacity: 0.6 }),
			},
			props.label as string,
		),
		h(
			'div',
			{
				'data-mdocui-stat-value': true,
				style: styleUnless(className, { fontSize: '24px', fontWeight: 700 }),
			},
			props.value as string,
		),
		changeNode,
	)
}

export function progress({ props, className }: PureArgs): VElement {
	const value = Number(props.value) || 0
	const label = props.label as string | undefined
	const max = Number(props.max) || 100
	const pct = Math.min(100, Math.max(0, (value / max) * 100))
	const themed = !!className

	const labelNode: VNode = label
		? h(
				'div',
				{
					'data-mdocui-progress-label': true,
					style: styleUnless(className, {
						fontSize: '13px',
						marginBottom: '4px',
						display: 'flex',
						justifyContent: 'space-between',
					}),
				},
				h('span', {}, label),
				h(
					'span',
					{
						'data-mdocui-progress-pct': true,
						style: styleUnless(className, { opacity: 0.6 }),
					},
					`${Math.round(pct)}%`,
				),
			)
		: null

	return h(
		'div',
		{
			class: className,
			'data-mdocui-progress': true,
			role: 'progressbar',
			'aria-valuenow': value,
			'aria-valuemin': 0,
			'aria-valuemax': max,
			'aria-label': label ?? 'Progress',
		},
		labelNode,
		h(
			'div',
			{
				'data-mdocui-progress-track': true,
				style: styleUnless(className, {
					height: '8px',
					background: 'currentColor',
					borderRadius: '4px',
					overflow: 'hidden',
					opacity: 0.1,
				}),
			},
			h('div', {
				'data-mdocui-progress-fill': true,
				style: {
					width: `${pct}%`,
					...(themed ? {} : { height: '100%', background: 'currentColor', borderRadius: '4px' }),
				},
			}),
		),
	)
}
