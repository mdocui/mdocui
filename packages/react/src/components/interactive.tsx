import type { ActionEvent } from '@mdocui/core'
import { useState } from 'react'
import type { ComponentProps } from '../context'

export function Button({ props, className, onAction, isStreaming }: ComponentProps) {
	const action = props.action as string
	const label = props.label as string
	const variant = (props.variant as string) ?? 'primary'
	const disabled = (props.disabled as boolean) ?? false
	const [clicked, setClicked] = useState(false)

	const isDisabled = isStreaming || disabled || clicked

	const handleClick = () => {
		if (isDisabled) return
		const event: ActionEvent = {
			type: 'button_click',
			action,
			label,
			tagName: 'button',
		}
		onAction(event)
		setClicked(true)
	}

	return (
		<button
			type="button"
			className={className}
			data-mdocui-button
			data-variant={variant}
			disabled={isDisabled}
			onClick={handleClick}
			style={{
				padding: '8px 16px',
				borderRadius: '6px',
				cursor: isDisabled ? 'not-allowed' : 'pointer',
				opacity: isDisabled ? 0.5 : 1,
				color: 'inherit',
				background: 'none',
				border: '1px solid currentColor',
			}}
		>
			{label}
		</button>
	)
}

export function ButtonGroup({ props, className, children }: ComponentProps) {
	const direction = (props.direction as string) ?? 'horizontal'

	return (
		<div
			className={className}
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

export function Input({ props, className }: ComponentProps) {
	const name = props.name as string
	const label = props.label as string | undefined
	const placeholder = (props.placeholder as string) ?? ''
	const type = (props.type as string) ?? 'text'
	const required = (props.required as boolean) ?? false
	const id = `mdocui-${name}`

	return (
		<div className={className} data-mdocui-input>
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
					border: '1px solid currentColor',
					borderRadius: '6px',
					boxSizing: 'border-box',
					background: 'transparent',
					color: 'inherit',
					opacity: 0.8,
				}}
			/>
		</div>
	)
}

export function Textarea({ props, className }: ComponentProps) {
	const name = props.name as string
	const label = props.label as string | undefined
	const placeholder = (props.placeholder as string) ?? ''
	const rows = (props.rows as number) ?? 3
	const required = (props.required as boolean) ?? false
	const id = `mdocui-${name}`

	return (
		<div className={className} data-mdocui-textarea>
			{label && (
				<label htmlFor={id} style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
					{label}
				</label>
			)}
			<textarea
				id={id}
				name={name}
				placeholder={placeholder}
				rows={rows}
				required={required}
				style={{
					width: '100%',
					padding: '8px 12px',
					border: '1px solid currentColor',
					borderRadius: '6px',
					boxSizing: 'border-box',
					resize: 'vertical',
					background: 'transparent',
					color: 'inherit',
					opacity: 0.8,
				}}
			/>
		</div>
	)
}

export function Toggle({ props, className, onAction, isStreaming }: ComponentProps) {
	const name = props.name as string
	const label = props.label as string
	const checked = (props.checked as boolean) ?? false

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (isStreaming) return
		onAction({
			type: 'select_change',
			action: `change:${name}`,
			tagName: 'toggle',
			params: { name, value: e.target.checked },
		})
	}

	return (
		<label
			className={className}
			data-mdocui-toggle
			style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
		>
			<input
				type="checkbox"
				role="switch"
				aria-checked={checked}
				name={name}
				defaultChecked={checked}
				onChange={handleChange}
			/>
			<span>{label}</span>
		</label>
	)
}

export function Select({ props, className, onAction, isStreaming }: ComponentProps) {
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
		<div className={className} data-mdocui-select>
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
					border: '1px solid currentColor',
					borderRadius: '6px',
					background: 'transparent',
					color: 'inherit',
					opacity: 0.8,
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

export function Checkbox({ props, className, onAction, isStreaming }: ComponentProps) {
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
			className={className}
			data-mdocui-checkbox
			style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
		>
			<input type="checkbox" name={name} defaultChecked={checked} onChange={handleChange} />
			<span>{label}</span>
		</label>
	)
}

export function Form({ props, className, children, onAction, isStreaming }: ComponentProps) {
	const formName = props.name as string
	const action = (props.action as string) ?? `submit:${formName}`
	const [submitted, setSubmitted] = useState(false)

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (isStreaming || submitted) return

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
		setSubmitted(true)
	}

	if (submitted) {
		return (
			<div
				className={className}
				data-mdocui-form
				data-name={formName}
				data-submitted
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '12px',
					opacity: 0.5,
					pointerEvents: 'none',
				}}
			>
				{children}
			</div>
		)
	}

	return (
		<form
			className={className}
			data-mdocui-form
			data-name={formName}
			onSubmit={handleSubmit}
			style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
		>
			{children}
		</form>
	)
}
