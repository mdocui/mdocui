import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const CLI_PATH = path.resolve(__dirname, '../dist/index.js')
const coreRoot = path.resolve(__dirname, '../../..')

function run(args: string, cwd: string): string {
	return execSync(`node ${CLI_PATH} ${args}`, {
		cwd,
		encoding: 'utf-8',
		env: { ...process.env, NODE_OPTIONS: '' },
	})
}

describe('CLI', () => {
	let tmpDir: string

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdocui-cli-'))
	})

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true })
	})

	it('prints help with no args', () => {
		const out = run('', tmpDir)
		expect(out).toContain('mdocui')
		expect(out).toContain('generate')
		expect(out).toContain('preview')
		expect(out).toContain('init')
	})

	it('prints help with --help', () => {
		const out = run('--help', tmpDir)
		expect(out).toContain('Commands:')
	})

	it('init creates config file', () => {
		const out = run('init', tmpDir)
		expect(out).toContain('Created')
		expect(fs.existsSync(path.join(tmpDir, 'mdocui.config.ts'))).toBe(true)
		expect(fs.existsSync(path.join(tmpDir, 'generated'))).toBe(true)
	})

	it('init skips if config already exists', () => {
		fs.writeFileSync(path.join(tmpDir, 'mdocui.config.ts'), 'existing')
		const out = run('init', tmpDir)
		expect(out).toContain('already exists')
	})

	it('generate fails without config', () => {
		expect(() => run('generate', tmpDir)).toThrow()
	})

	it('generate writes system prompt from config', () => {
		const config = `
import { defineComponent } from '${coreRoot}/packages/core/dist/index.js'
import { z } from '${coreRoot}/node_modules/zod/index.js'

export default {
  components: [
    defineComponent({
      name: 'button',
      description: 'A button',
      props: z.object({ label: z.string().describe('text') }),
      children: 'none',
    }),
  ],
  output: './out/prompt.txt',
}
`
		fs.writeFileSync(path.join(tmpDir, 'mdocui.config.mjs'), config)
		const out = run('generate', tmpDir)
		expect(out).toContain('Generated system prompt')
		expect(out).toContain('1 components')

		const prompt = fs.readFileSync(path.join(tmpDir, 'out/prompt.txt'), 'utf-8')
		expect(prompt).toContain('{% button')
		expect(prompt).toContain('A button')
	})

	it('preview prints prompt to stdout', () => {
		const config = `
import { defineComponent } from '${coreRoot}/packages/core/dist/index.js'
import { z } from '${coreRoot}/node_modules/zod/index.js'

export default {
  components: [
    defineComponent({
      name: 'chart',
      description: 'Data chart',
      props: z.object({ type: z.enum(['bar','line']).describe('chart type') }),
    }),
  ],
}
`
		fs.writeFileSync(path.join(tmpDir, 'mdocui.config.mjs'), config)
		const out = run('preview', tmpDir)
		expect(out).toContain('mdocUI format')
		expect(out).toContain('{% chart')
		expect(out).toContain('chart type')
	})
})
