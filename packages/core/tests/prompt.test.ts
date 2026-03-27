import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { generatePrompt } from '../src/prompt'
import { ComponentRegistry, defineComponent } from '../src/registry'

describe('generatePrompt', () => {
	it('generates basic prompt with components', () => {
		const reg = new ComponentRegistry()
		reg.register(
			defineComponent({
				name: 'button',
				description: 'Clickable action button',
				props: z.object({
					action: z.string().describe('Action to perform'),
					label: z.string().describe('Button text'),
				}),
				children: 'none',
			}),
		)

		const prompt = generatePrompt(reg)
		expect(prompt).toContain('mdocUI format')
		expect(prompt).toContain('TAG SYNTAX')
		expect(prompt).toContain('{% button')
		expect(prompt).toContain('Clickable action button')
		expect(prompt).toContain('STREAMING GUIDELINE')
	})

	it('includes preamble', () => {
		const reg = new ComponentRegistry()
		const prompt = generatePrompt(reg, { preamble: 'You are a helpful assistant.' })
		expect(prompt).toMatch(/^You are a helpful assistant\./)
	})

	it('includes additional rules', () => {
		const reg = new ComponentRegistry()
		const prompt = generatePrompt(reg, {
			additionalRules: ['Always end with buttons', 'Keep responses concise'],
		})
		expect(prompt).toContain('RULES')
		expect(prompt).toContain('Always end with buttons')
		expect(prompt).toContain('Keep responses concise')
	})

	it('includes examples', () => {
		const reg = new ComponentRegistry()
		const prompt = generatePrompt(reg, {
			examples: ['Here is a sample response with a button.'],
		})
		expect(prompt).toContain('EXAMPLE')
		expect(prompt).toContain('Here is a sample response with a button.')
	})

	it('marks optional props with ?', () => {
		const reg = new ComponentRegistry()
		reg.register(
			defineComponent({
				name: 'chart',
				description: 'Data chart',
				props: z.object({
					type: z.string().describe('Chart type'),
					title: z.string().optional().describe('Chart title'),
				}),
			}),
		)
		const prompt = generatePrompt(reg)
		expect(prompt).toContain('title?')
	})

	it('generates empty components section when registry is empty', () => {
		const reg = new ComponentRegistry()
		const prompt = generatePrompt(reg)
		expect(prompt).not.toContain('## COMPONENTS')
		expect(prompt).toContain('TAG SYNTAX')
	})

	it('groups components by category', () => {
		const reg = new ComponentRegistry()
		reg.registerAll([
			defineComponent({
				name: 'button',
				description: 'Clickable button',
				props: z.object({ label: z.string().describe('text') }),
				children: 'none',
			}),
			defineComponent({
				name: 'chart',
				description: 'Data chart',
				props: z.object({ type: z.string().describe('chart type') }),
			}),
			defineComponent({
				name: 'callout',
				description: 'Highlighted message',
				props: z.object({ type: z.string().describe('severity') }),
				children: 'any',
			}),
		])

		const prompt = generatePrompt(reg, {
			groups: [
				{
					name: 'Interactive',
					components: ['button'],
					notes: ['Use buttons for user actions'],
				},
				{
					name: 'Data',
					components: ['chart'],
				},
			],
		})

		expect(prompt).toContain('### Interactive')
		expect(prompt).toContain('> Use buttons for user actions')
		expect(prompt).toContain('### Data')
		// callout is ungrouped, should still appear
		expect(prompt).toContain('Highlighted message')
	})
})
