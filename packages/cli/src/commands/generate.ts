import fs from 'node:fs'
import path from 'node:path'
import { ComponentRegistry, generatePrompt } from '@mdocui/core'
import { loadConfig, toPromptOptions } from '../config'

export async function generate(cwd: string) {
	const config = await loadConfig(cwd)
	const registry = new ComponentRegistry()
	registry.registerAll(config.components)

	const prompt = generatePrompt(registry, toPromptOptions(config))
	const outputPath = path.resolve(cwd, config.output ?? 'system-prompt.txt')

	fs.mkdirSync(path.dirname(outputPath), { recursive: true })
	fs.writeFileSync(outputPath, prompt, 'utf-8')

	console.log(`Generated system prompt → ${path.relative(cwd, outputPath)}`)
	console.log(`${registry.names().length} components, ${prompt.length} chars`)
}
