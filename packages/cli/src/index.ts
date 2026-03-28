import { generate } from './commands/generate'
import { init } from './commands/init'
import { preview } from './commands/preview'

const args = process.argv.slice(2)
const command = args[0]
const cwd = process.cwd()

async function main() {
	switch (command) {
		case 'generate':
			await generate(cwd)
			break
		case 'preview':
			await preview(cwd)
			break
		case 'init':
			await init(cwd)
			break
		case '--help':
		case '-h':
		case undefined:
			printHelp()
			break
		default:
			console.error(`Unknown command: ${command}`)
			printHelp()
			process.exit(1)
	}
}

function printHelp() {
	console.log(`
mdocui — CLI for mdocUI generative UI library

Commands:
  init        Scaffold a new mdocui config file
  generate    Generate system prompt from component registry
  preview     Print generated system prompt to stdout

Usage:
  npx @mdocui/cli init
  npx @mdocui/cli generate
  npx @mdocui/cli preview
`)
}

main().catch((err) => {
	console.error(err.message)
	process.exit(1)
})
