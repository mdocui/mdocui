import type { ComponentProps } from '../context'

export function Chart({ props }: ComponentProps) {
	const type = props.type as string
	const labels = (props.labels as string[]) ?? []
	const values = (props.values as number[]) ?? []
	const title = props.title as string | undefined
	const max = values.reduce((a, b) => Math.max(a, b), 1)

	return (
		<div data-mdocui-chart data-type={type}>
			{title && <div style={{ fontWeight: 600, marginBottom: '8px' }}>{title}</div>}
			{(type === 'bar' || type === 'line') && (
				<div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px' }}>
					{values.map((val, i) => (
						<div key={labels[i] ?? i} style={{ flex: 1, textAlign: 'center' }}>
							<div
								style={{
									height: `${(val / max) * 100}%`,
									background: '#3b82f6',
									borderRadius: '4px 4px 0 0',
									minHeight: '2px',
								}}
							/>
							<div style={{ fontSize: '11px', marginTop: '4px', color: '#64748b' }}>
								{labels[i]}
							</div>
						</div>
					))}
				</div>
			)}
			{(type === 'pie' || type === 'donut') && (
				<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
					{labels.map((label, i) => (
						<span key={label} style={{ fontSize: '13px' }}>
							{label}: {values[i]}
						</span>
					))}
				</div>
			)}
		</div>
	)
}

export function Table({ props }: ComponentProps) {
	const headers = (props.headers as string[]) ?? []
	const rows = (props.rows as string[][]) ?? []
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
								borderBottom: '2px solid #e2e8f0',
								fontWeight: 600,
							}}
						>
							{h}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<tr key={row.join('\t')}>
						{row.map((cell, _ci) => {
							const cellKey = `${row[0]}-${cell}`
							return (
								<td key={cellKey} style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
									{cell}
								</td>
							)
						})}
					</tr>
				))}
			</tbody>
		</table>
	)
}

export function Stat({ props }: ComponentProps) {
	const label = props.label as string
	const value = props.value as string
	const change = props.change as string | undefined
	const trend = (props.trend as string) ?? 'neutral'

	const trendColor = trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : '#64748b'

	return (
		<div data-mdocui-stat>
			<div style={{ fontSize: '13px', color: '#64748b' }}>{label}</div>
			<div style={{ fontSize: '24px', fontWeight: 700 }}>{value}</div>
			{change && <div style={{ fontSize: '13px', color: trendColor }}>{change}</div>}
		</div>
	)
}

export function Progress({ props }: ComponentProps) {
	const value = props.value as number
	const label = props.label as string | undefined
	const max = (props.max as number) ?? 100
	const pct = Math.min(100, Math.max(0, (value / max) * 100))

	return (
		<div data-mdocui-progress>
			{label && <div style={{ fontSize: '13px', marginBottom: '4px' }}>{label}</div>}
			<div
				style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}
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
