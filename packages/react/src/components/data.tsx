import type { ComponentProps } from '../context'

export function Chart({ props }: ComponentProps) {
	const type = props.type as string
	const labels = Array.isArray(props.labels) ? props.labels : []
	const values = Array.isArray(props.values) ? (props.values as number[]).map(Number) : []
	const title = props.title as string | undefined
	const max = values.reduce((a, b) => Math.max(a, b), 1)

	return (
		<div data-mdocui-chart data-type={type} style={{ padding: '12px 0' }}>
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
							<div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>{val}</div>
							<div
								style={{
									height: `${Math.max((val / max) * 100, 4)}%`,
									background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
									borderRadius: '4px 4px 0 0',
									minHeight: '4px',
								}}
							/>
							<div style={{ fontSize: '11px', marginTop: '6px', color: '#64748b' }}>
								{labels[i]}
							</div>
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
							<div
								key={label}
								style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
							>
								<div
									style={{
										width: 10,
										height: 10,
										borderRadius: '50%',
										background: chartColors[i % chartColors.length],
									}}
								/>
								<span>
									{label}: {values[i]} ({pct}%)
								</span>
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}

const chartColors = [
	'#3b82f6',
	'#22c55e',
	'#f59e0b',
	'#ef4444',
	'#8b5cf6',
	'#ec4899',
	'#06b6d4',
	'#f97316',
]

export function Table({ props }: ComponentProps) {
	const headers = Array.isArray(props.headers) ? props.headers : []
	const rows = Array.isArray(props.rows) ? props.rows : []
	const caption = props.caption as string | undefined

	return (
		<table data-mdocui-table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
								borderBottom: '2px solid #333',
								fontWeight: 600,
								color: '#94a3b8',
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
									<td key={cellKey} style={{ padding: '8px', borderBottom: '1px solid #222' }}>
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

export function Stat({ props }: ComponentProps) {
	const label = props.label as string
	const value = props.value as string
	const change = props.change as string | undefined
	const trend = (props.trend as string) ?? 'neutral'

	const trendColor = trend === 'up' ? '#4ade80' : trend === 'down' ? '#f87171' : '#64748b'

	return (
		<div data-mdocui-stat style={{ padding: '8px 0' }}>
			<div style={{ fontSize: '13px', color: '#64748b' }}>{label}</div>
			<div style={{ fontSize: '24px', fontWeight: 700 }}>{value}</div>
			{change && <div style={{ fontSize: '13px', color: trendColor }}>{change}</div>}
		</div>
	)
}

export function Progress({ props }: ComponentProps) {
	const value = Number(props.value) || 0
	const label = props.label as string | undefined
	const max = Number(props.max) || 100
	const pct = Math.min(100, Math.max(0, (value / max) * 100))

	return (
		<div data-mdocui-progress>
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
					<span style={{ color: '#64748b' }}>{Math.round(pct)}%</span>
				</div>
			)}
			<div
				style={{ height: '8px', background: '#27272a', borderRadius: '4px', overflow: 'hidden' }}
			>
				<div
					style={{
						height: '100%',
						width: `${pct}%`,
						background: '#3b82f6',
						borderRadius: '4px',
						transition: 'width 0.3s',
					}}
				/>
			</div>
		</div>
	)
}
