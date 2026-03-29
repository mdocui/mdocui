import type { ComponentProps } from '../context'

export function Chart({ props, className }: ComponentProps) {
	const type = props.type as string
	const labels = Array.isArray(props.labels) ? props.labels : []
	const values = Array.isArray(props.values) ? (props.values as number[]).map(Number) : []
	const title = props.title as string | undefined
	const max = values.reduce((a, b) => Math.max(a, b), 1)

	return (
		<div
			className={className}
			data-mdocui-chart
			data-type={type}
			role="img"
			aria-label={title ?? `${type} chart`}
			style={{ padding: '12px 0' }}
		>
			{title && <div style={{ fontWeight: 600, marginBottom: '12px' }}>{title}</div>}
			{(type === 'bar' || type === 'line') && (
				<div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '140px' }}>
					{values.map((val, i) => (
						<div
							key={labels[i] ?? i}
							style={{
								flex: 1,
								textAlign: 'center',
								display: 'flex',
								flexDirection: 'column',
								justifyContent: 'flex-end',
								height: '100%',
							}}
						>
							<div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>{val}</div>
							<div
								data-mdocui-chart-bar
								style={{
									height: `${Math.max((val / max) * 100, 4)}%`,
									background: 'currentColor',
									borderRadius: '4px 4px 0 0',
									minHeight: '4px',
									opacity: 0.25,
								}}
							/>
							<div style={{ fontSize: '11px', marginTop: '6px', opacity: 0.5 }}>{labels[i]}</div>
						</div>
					))}
				</div>
			)}
			{(type === 'pie' || type === 'donut') && (
				<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
					{labels.map((label, i) => {
						const total = values.reduce((a, b) => a + b, 0)
						const pct = total > 0 ? Math.round((values[i] / total) * 100) : 0
						return (
							<span key={label} style={{ fontSize: '13px' }}>
								{label}: {values[i]} ({pct}%)
							</span>
						)
					})}
				</div>
			)}
		</div>
	)
}

export function Table({ props, className }: ComponentProps) {
	const headers = Array.isArray(props.headers) ? props.headers : []
	const rows = Array.isArray(props.rows) ? props.rows : []
	const caption = props.caption as string | undefined

	return (
		<table
			className={className}
			data-mdocui-table
			style={{ width: '100%', borderCollapse: 'collapse' }}
		>
			{caption && (
				<caption style={{ textAlign: 'left', fontWeight: 600, marginBottom: '8px' }}>
					{caption}
				</caption>
			)}
			<thead>
				<tr>
					{headers.map((h) => (
						<th
							key={h}
							style={{
								textAlign: 'left',
								padding: '8px',
								borderBottom: '2px solid currentColor',
								fontWeight: 600,
								opacity: 0.7,
								fontSize: '13px',
							}}
						>
							{h}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => {
					const cells = Array.isArray(row) ? row : [String(row)]
					return (
						<tr key={cells.join('\t')}>
							{cells.map((cell) => {
								const cellKey = `${cells[0]}-${cell}`
								return (
									<td
										key={cellKey}
										style={{ padding: '8px', borderBottom: '1px solid currentColor', opacity: 0.8 }}
									>
										{cell}
									</td>
								)
							})}
						</tr>
					)
				})}
			</tbody>
		</table>
	)
}

export function Stat({ props, className }: ComponentProps) {
	const label = props.label as string
	const value = props.value as string
	const change = props.change as string | undefined
	const trend = (props.trend as string) ?? 'neutral'

	return (
		<div className={className} data-mdocui-stat data-trend={trend} style={{ padding: '8px 0' }}>
			<div style={{ fontSize: '13px', opacity: 0.6 }}>{label}</div>
			<div style={{ fontSize: '24px', fontWeight: 700 }}>{value}</div>
			{change && <div style={{ fontSize: '13px' }}>{change}</div>}
		</div>
	)
}

export function Progress({ props, className }: ComponentProps) {
	const value = Number(props.value) || 0
	const label = props.label as string | undefined
	const max = Number(props.max) || 100
	const pct = Math.min(100, Math.max(0, (value / max) * 100))

	return (
		<div
			className={className}
			data-mdocui-progress
			role="progressbar"
			aria-valuenow={value}
			aria-valuemin={0}
			aria-valuemax={max}
			aria-label={label ?? 'Progress'}
		>
			{label && (
				<div
					style={{
						fontSize: '13px',
						marginBottom: '4px',
						display: 'flex',
						justifyContent: 'space-between',
					}}
				>
					<span>{label}</span>
					<span style={{ opacity: 0.6 }}>{Math.round(pct)}%</span>
				</div>
			)}
			<div
				data-mdocui-progress-track
				style={{
					height: '8px',
					background: 'currentColor',
					borderRadius: '4px',
					overflow: 'hidden',
					opacity: 0.1,
				}}
			>
				<div
					data-mdocui-progress-fill
					style={{
						height: '100%',
						width: `${pct}%`,
						background: 'currentColor',
						borderRadius: '4px',
					}}
				/>
			</div>
		</div>
	)
}
