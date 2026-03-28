import fs from 'node:fs'
import path from 'node:path'

type Framework = 'nextjs' | 'vite' | 'remix' | 'unknown'

interface DetectedProject {
	framework: Framework
	hasSrc: boolean
	hasApp: boolean // Next.js app router
	hasPages: boolean // Next.js pages router
}

function detectFramework(cwd: string): DetectedProject {
	const pkgPath = path.resolve(cwd, 'package.json')
	const hasSrc = fs.existsSync(path.resolve(cwd, 'src'))
	const hasApp =
		fs.existsSync(path.resolve(cwd, 'src/app')) || fs.existsSync(path.resolve(cwd, 'app'))
	const hasPages =
		fs.existsSync(path.resolve(cwd, 'src/pages')) || fs.existsSync(path.resolve(cwd, 'pages'))

	if (!fs.existsSync(pkgPath)) {
		return { framework: 'unknown', hasSrc, hasApp, hasPages }
	}

	const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
	const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }

	if (allDeps.next) return { framework: 'nextjs', hasSrc, hasApp, hasPages }
	if (allDeps['@remix-run/react'] || allDeps.remix)
		return { framework: 'remix', hasSrc, hasApp, hasPages }
	if (allDeps.vite) return { framework: 'vite', hasSrc, hasApp, hasPages }

	return { framework: 'unknown', hasSrc, hasApp, hasPages }
}

// ── File templates ─────────────────────────────────────────

function registryTemplate(): string {
	return `import { createDefaultRegistry } from '@mdocui/react'

// Pre-built registry with all 24 built-in mdocUI components:
//   Layout:      stack, grid, card, divider, accordion, tabs, tab
//   Interactive: button, button-group, input, textarea, select, checkbox, toggle, form
//   Data:        chart, table, stat, progress
//   Content:     callout, badge, image, code-block, link
//
// To add custom components, use the ComponentRegistry API directly:
//   import { ComponentRegistry } from '@mdocui/core'
//   import { allDefinitions } from '@mdocui/react'

export const registry = createDefaultRegistry()
`
}

function mdocMessageTemplate(): string {
	return `'use client'

import { useCallback, useRef } from 'react'
import { Renderer, useRenderer, defaultComponents } from '@mdocui/react'
import type { ActionHandler } from '@mdocui/react'
import { registry } from '@/lib/mdoc-registry'

interface MdocMessageProps {
  /** Called when the user clicks a button or submits a form */
  onAction?: ActionHandler
  /** Called when a "continue" action fires — typically sends the label as a new user message */
  onSend?: (message: string) => void
  /** Custom prose renderer, e.g. for markdown-to-HTML */
  renderProse?: (content: string, key: string) => React.ReactNode
  /** CSS class overrides per component name */
  classNames?: Record<string, string>
}

export function MdocMessage({ onAction, onSend, renderProse, classNames }: MdocMessageProps) {
  const { nodes, isStreaming, push, done, reset } = useRenderer({ registry })
  const abortRef = useRef<AbortController | null>(null)

  const handleAction: ActionHandler = useCallback(
    (action, params) => {
      if (action === 'continue' && onSend) {
        onSend(params?.label ?? action)
        return
      }
      onAction?.(action, params)
    },
    [onAction, onSend],
  )

  /** Stream a response from your API endpoint */
  const stream = useCallback(
    async (url: string, body: Record<string, unknown>) => {
      abortRef.current?.abort()
      reset()

      const controller = new AbortController()
      abortRef.current = controller

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error(\`Stream request failed: \${res.status}\`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done: readerDone, value } = await reader.read()
        if (readerDone) break
        push(decoder.decode(value, { stream: true }))
      }

      done()
    },
    [push, done, reset],
  )

  return (
    <Renderer
      nodes={nodes}
      components={defaultComponents}
      onAction={handleAction}
      isStreaming={isStreaming}
      renderProse={renderProse}
      classNames={classNames}
    />
  )
}

// Export the stream helper so parent components can drive it
export type { MdocMessageProps }
export { MdocMessage as default }
`
}

function envExampleTemplate(): string {
	return `# mdocUI — LLM API keys
# Copy this file to .env.local and fill in your keys.

# Anthropic (Claude)
ANTHROPIC_API_KEY=

# OpenAI
OPENAI_API_KEY=
`
}

function nextjsRouteTemplate(): string {
	return `import { type NextRequest, NextResponse } from 'next/server'
import { generatePrompt } from '@mdocui/core'
import { allDefinitions, defaultGroups } from '@mdocui/react'

// Build the system prompt once at module level
const systemPrompt = generatePrompt({
  components: allDefinitions,
  groups: defaultGroups,
  preamble: 'You are a helpful assistant. Use mdocUI components to create rich, interactive responses.',
})

export async function POST(req: NextRequest) {
  const { messages, provider = 'anthropic' } = await req.json()

  if (provider === 'openai') {
    return streamOpenAI(messages)
  }

  return streamAnthropic(messages)
}

// ── Anthropic (Claude) ─────────────────────────────────────

async function streamAnthropic(messages: Array<{ role: string; content: string }>) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
      stream: true,
    }),
  })

  if (!res.ok || !res.body) {
    const text = await res.text()
    return NextResponse.json({ error: text }, { status: res.status })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const event = JSON.parse(data)
            if (event.type === 'content_block_delta' && event.delta?.text) {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          } catch {
            // skip malformed events
          }
        }
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

// ── OpenAI ─────────────────────────────────────────────────

async function streamOpenAI(messages: Array<{ role: string; content: string }>) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 })
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${apiKey}\`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
    }),
  })

  if (!res.ok || !res.body) {
    const text = await res.text()
    return NextResponse.json({ error: text }, { status: res.status })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const event = JSON.parse(data)
            const content = event.choices?.[0]?.delta?.content
            if (content) {
              controller.enqueue(encoder.encode(content))
            }
          } catch {
            // skip malformed events
          }
        }
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
`
}

function configTemplate(): string {
	return `import { allDefinitions, defaultGroups } from '@mdocui/react'

export default {
  components: allDefinitions,
  groups: defaultGroups,
  output: './generated/system-prompt.txt',
  preamble: 'You are a helpful assistant. Use mdocUI components to create rich, interactive responses.',
}
`
}

// ── Scaffolder ─────────────────────────────────────────────

interface ScaffoldedFile {
	relativePath: string
	content: string
}

function writeIfMissing(cwd: string, file: ScaffoldedFile): boolean {
	const abs = path.resolve(cwd, file.relativePath)
	if (fs.existsSync(abs)) {
		console.log(`  skip  ${file.relativePath}  (already exists)`)
		return false
	}
	fs.mkdirSync(path.dirname(abs), { recursive: true })
	fs.writeFileSync(abs, file.content, 'utf-8')
	return true
}

export async function init(cwd: string) {
	const project = detectFramework(cwd)

	console.log('')
	console.log(`  Detected: ${frameworkLabel(project.framework)}`)
	console.log('')

	const files: ScaffoldedFile[] = []

	// Always generate these
	files.push({ relativePath: 'src/lib/mdoc-registry.ts', content: registryTemplate() })
	files.push({ relativePath: 'src/components/mdoc-message.tsx', content: mdocMessageTemplate() })
	files.push({ relativePath: '.env.example', content: envExampleTemplate() })
	files.push({ relativePath: 'mdocui.config.ts', content: configTemplate() })

	// Framework-specific files
	if (project.framework === 'nextjs') {
		const routeDir = project.hasSrc ? 'src/app/api/chat' : 'app/api/chat'
		files.push({ relativePath: `${routeDir}/route.ts`, content: nextjsRouteTemplate() })
	}

	// Write files
	const created: string[] = []
	const skipped: string[] = []

	for (const file of files) {
		if (writeIfMissing(cwd, file)) {
			created.push(file.relativePath)
		} else {
			skipped.push(file.relativePath)
		}
	}

	// Ensure generated/ dir
	const generatedDir = path.resolve(cwd, 'generated')
	if (!fs.existsSync(generatedDir)) {
		fs.mkdirSync(generatedDir, { recursive: true })
		fs.writeFileSync(path.resolve(generatedDir, '.gitkeep'), '', 'utf-8')
		created.push('generated/')
	}

	// Summary
	console.log('')
	if (created.length > 0) {
		console.log('  Created:')
		for (const f of created) {
			console.log(`    + ${f}`)
		}
	}
	if (skipped.length > 0) {
		console.log('  Skipped (already exist):')
		for (const f of skipped) {
			console.log(`    - ${f}`)
		}
	}

	console.log('')
	console.log('  Next steps:')
	console.log('    1. Copy .env.example to .env.local and add your API keys')
	console.log('    2. Install dependencies:')
	console.log('       npm install @mdocui/core @mdocui/react')
	console.log('    3. Generate the system prompt:')
	console.log('       npx @mdocui/cli generate')
	if (project.framework === 'nextjs') {
		console.log('    4. Import <MdocMessage /> in your chat page')
		console.log('       and call stream("/api/chat", { messages })')
	} else {
		console.log('    4. Import <MdocMessage /> in your chat component')
		console.log('       and wire up streaming from your backend')
	}
	console.log('')
}

function frameworkLabel(fw: Framework): string {
	switch (fw) {
		case 'nextjs':
			return 'Next.js'
		case 'vite':
			return 'Vite'
		case 'remix':
			return 'Remix'
		case 'unknown':
			return 'Unknown framework (generating generic files)'
	}
}
