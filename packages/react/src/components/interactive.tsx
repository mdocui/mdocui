import type { ActionEvent } from '@mdocui/core'
import type { ComponentProps } from '../context'

export function Button({ props, onAction, isStreaming }: ComponentProps) {
	const action = props.action as string
	const label = props.label as string
	const variant = (props.variant as string) ?? 'primary'
	const disabled = (props.disabled as boolean) ?? false

	const handleClick = () => {
		if (isStreaming || disabled) return
		const event: ActionEvent = {
			type: 'button_click',
			action,
			label,
			tagName: 'button',
		}
		onAction(event)
	}

	return (
		<button
			type="button"
			data-mdocui-button
			data-variant={variant}
			disabled={isStreaming || disabled}
			onClick={handleClick}
			style={{
				padding: '8px 16px',
				borderRadius: '6px',
				cursor: isStreaming || disabled ? 'not-allowed' : 'pointer',
				opacity: isStreaming || disabled ? 0.6 : 1,
				border: variant === 'outline' ? '1px solid #555' : 'none',
				background:
					variant === 'primary' ? '#3b82f6' : variant === 'ghost' ? 'transparent' : '#27272a',
				color: '#fff',
			}}
		>
			{label}
		</button>
	)
}

export function ButtonGroup({ props, children }: ComponentProps) {
	const direction = (props.direction as string) ?? 'horizontal'

	return (
		<div
			data-mdocui-button-group
			style={{
				display: 'flex',
				flexDirection: direction === 'vertical' ? 'column' : 'row',
				gap: '8px',
			}}
		>
			{children}
		</div>
	)
}

export function Input({ props }: ComponentProps) {
	const name = props.name as string
	const label = props.label as string | undefined
	const placeholder = (props.placeholder as string) ?? ''
	const type = (props.type as string) ?? 'text'
	const required = (props.required as boolean) ?? false

	const id = `mdocui-${name}`

	return (
		<div data-mdocui-input>
			{label && (
				<label htmlFor={id} style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
					{label}
				</label>
			)}
			<input
				id={id}
				name={name}
				type={type}
				placeholder={placeholder}
				required={required}
				style={{
					width: '100%',
					padding: '8px 12px',
					border: '1px solid #333',
					background: '#18181b',
					color: 'inherit',
					borderRadius: '6px',
					boxSizing: 'border-box',
				}}
			/>
		</div>
	)
}

export function Select({ props, onAction, isStreaming }: ComponentProps) {
	const name = props.name as string
	const label = props.label as string | undefined
	const options = Array.isArray(props.options) ? props.options : []
	const placeholder = props.placeholder as string | undefined
	const required = (props.required as boolean) ?? false
	const id = `mdocui-${name}`

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		if (isStreaming) return
		onAction({
			type: 'select_change',
			action: `change:${name}`,
			tagName: 'select',
			params: { name, value: e.target.value },
		})
	}

	return (
		<div data-mdocui-select>
			{label && (
				<label htmlFor={id} style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
					{label}
				</label>
			)}
			<select
				id={id}
				name={name}
				required={required}
				onChange={handleChange}
				style={{
					width: '100%',
					padding: '8px 12px',
					border: '1px solid #333',
					background: '#18181b',
					color: 'inherit',
					borderRadius: '6px',
				}}
			>
				{placeholder && <option value="">{placeholder}</option>}
				{options.map((opt) => (
					<option key={opt} value={opt}>
						{opt}
					</option>
				))}
			</select>
		</div>
	)
}

export function Checkbox({ props, onAction, isStreaming }: ComponentProps) {
	const name = props.name as string
	const label = props.label as string
	const checked = (props.checked as boolean) ?? false

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (isStreaming) return
		onAction({
			type: 'select_change',
			action: `change:${name}`,
			tagName: 'checkbox',
			params: { name, value: e.target.checked },
		})
	}

	return (
		<label
			data-mdocui-checkbox
			style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
		>
			<input type="checkbox" name={name} defaultChecked={checked} onChange={handleChange} />
			<span>{label}</span>
		</label>
	)
}

export function Form({ props, children, onAction, isStreaming }: ComponentProps) {
	const formName = props.name as string
	const action = (props.action as string) ?? `submit:${formName}`

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (isStreaming) return

		const formData = new FormData(e.currentTarget)
		const state: Record<string, unknown> = {}
		formData.forEach((value, key) => {
			state[key] = value
		})

		const event: ActionEvent = {
			type: 'form_submit',
			action,
			formName,
			formState: state,
			tagName: 'form',
		}
		onAction(event)
	}

	return (
		<form
			data-mdocui-form
			data-name={formName}
			onSubmit={handleSubmit}
			style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
		>
			{children}
		</form>
	)
}
