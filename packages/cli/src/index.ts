import { generate } from './commands/generate'
import { init } from './commands/init'
import { preview } from './commands/preview'

const args = process.argv.slice(2)
const command = args[0]
const cwd = process.cwd()

function parseFlag(flag: string): string | undefined {
	const idx = args.indexOf(flag)
	if (idx !== -1 && idx + 1 < args.length) return args[idx + 1]
	const eq = args.find((a) => a.startsWith(`${flag}=`))
	if (eq) return eq.split('=')[1]
	return undefined
}

async function main() {
	switch (command) {
		case 'generate':
			await generate(cwd)
			break
		case 'preview': {
			const portStr = parseFlag('--port')
			await preview(cwd, portStr ? { port: Number(portStr) } : undefined)
			break
		}
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
  init        Scaffold mdocUI integration (registry, components, API route)
  generate    Generate system prompt from component registry
  preview     Start local dev server with live mdocUI markup preview

Options:
  --port <n>  Port for preview server (default: 4321)

Usage:
  npx @mdocui/cli init
  npx @mdocui/cli generate
  npx @mdocui/cli preview
  npx @mdocui/cli preview --port 3000
`)
}

main().catch((err) => {
	console.error(err.message)
	process.exit(1)
})
