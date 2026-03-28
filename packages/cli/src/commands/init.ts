import fs from 'node:fs'
import path from 'node:path'

const CONFIG_TEMPLATE = `import { defineComponent } from '@mdocui/core'
import { z } from 'zod'

const button = defineComponent({
  name: 'button',
  description: 'Clickable action button',
  props: z.object({
    action: z.string().describe('Action to perform'),
    label: z.string().describe('Button text'),
  }),
  children: 'none',
})

const callout = defineComponent({
  name: 'callout',
  description: 'Highlighted message block',
  props: z.object({
    type: z.enum(['info', 'warning', 'error', 'success']).describe('Severity'),
    title: z.string().optional().describe('Heading'),
  }),
  children: 'any',
})

export default {
  components: [button, callout],
  output: './generated/system-prompt.txt',
  preamble: 'You are a helpful assistant.',
  additionalRules: [
    'End responses with follow-up buttons using action="continue"',
  ],
}
`

export async function init(cwd: string) {
	const configPath = path.resolve(cwd, 'mdocui.config.ts')
	const generatedDir = path.resolve(cwd, 'generated')

	if (fs.existsSync(configPath)) {
		console.log('mdocui.config.ts already exists — skipping')
		return
	}

	fs.writeFileSync(configPath, CONFIG_TEMPLATE, 'utf-8')
	fs.mkdirSync(generatedDir, { recursive: true })
	fs.writeFileSync(
		path.resolve(generatedDir, '.gitkeep'),
		'',
		'utf-8',
	)

	console.log('Created:')
	console.log('  mdocui.config.ts    — component definitions + config')
	console.log('  generated/          — output directory for system prompts')
	console.log('')
	console.log('Next steps:')
	console.log('  1. Edit mdocui.config.ts — add your components')
	console.log('  2. Run: npx @mdocui/cli generate')
}
