import { ComponentRegistry, generatePrompt } from '@mdocui/core'
import { loadConfig, toPromptOptions } from '../config'

export async function preview(cwd: string) {
	const config = await loadConfig(cwd)
	const registry = new ComponentRegistry()
	registry.registerAll(config.components)

	const prompt = generatePrompt(registry, toPromptOptions(config))
	console.log(prompt)
}
