import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ComponentDefinition, ComponentGroup, PromptOptions } from '@mdocui/core'

export interface MdocUIConfig {
	components: ComponentDefinition[]
	output?: string
	preamble?: string
	additionalRules?: string[]
	examples?: string[]
	groups?: ComponentGroup[]
}

const CONFIG_FILES = ['mdocui.config.ts', 'mdocui.config.js', 'mdocui.config.mjs']

export async function loadConfig(cwd: string): Promise<MdocUIConfig> {
	for (const name of CONFIG_FILES) {
		const configPath = path.resolve(cwd, name)
		if (!fs.existsSync(configPath)) continue

		const url = pathToFileURL(configPath).href
		const mod = await import(url)
		const config = mod.default ?? mod

		if (!config.components || !Array.isArray(config.components)) {
			throw new Error(`${name}: "components" must be an array of ComponentDefinition`)
		}

		return config as MdocUIConfig
	}

	throw new Error(`No config file found. Create one of: ${CONFIG_FILES.join(', ')}`)
}

export function toPromptOptions(config: MdocUIConfig): PromptOptions {
	return {
		preamble: config.preamble,
		additionalRules: config.additionalRules,
		examples: config.examples,
		groups: config.groups,
	}
}
