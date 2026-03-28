# @mdocui/cli

CLI for [mdocUI](https://github.com/mdocui/mdocui) — scaffold projects, generate system prompts, and preview output.

## Install

```bash
npx @mdocui/cli init
```

Or install globally:

```bash
pnpm add -g @mdocui/cli
```

## Commands

### `init`

Scaffold a complete mdocUI integration. Detects your framework (Next.js, Vite, Remix) and generates all required files.

```bash
npx @mdocui/cli init
```

Creates:
- `mdocui.config.ts` — config with all 24 component definitions
- `src/lib/mdoc-registry.ts` — component registry setup
- `src/components/mdoc-message.tsx` — streaming message component using `useRenderer`
- `.env.example` — API key placeholders
- `src/app/api/chat/route.ts` — streaming API route (Next.js only)

### `generate`

Generate a system prompt from your component registry and write it to a file.

```bash
npx @mdocui/cli generate
```

Reads `mdocui.config.ts` and writes the prompt to the configured `output` path (default: `system-prompt.txt`).

### `preview`

Start a local dev server with a split-pane editor for live markup rendering and parse validation.

```bash
npx @mdocui/cli preview
npx @mdocui/cli preview --port 3000
```

Opens a browser UI where you type mdocUI markup on the left and see it rendered on the right in real-time. Great for prompt iteration without burning API calls.

## Config File

```typescript
// mdocui.config.ts
import { defineComponent } from '@mdocui/core'
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

export default {
  components: [button],
  output: './generated/system-prompt.txt',
  preamble: 'You are a helpful assistant.',
  additionalRules: ['End responses with follow-up buttons'],
  groups: [{ name: 'Interactive', components: ['button'] }],
}
```

## Links

- [GitHub Repository](https://github.com/mdocui/mdocui)
- [@mdocui/core](https://github.com/mdocui/mdocui/tree/main/packages/core)
- [@mdocui/react](https://github.com/mdocui/mdocui/tree/main/packages/react)
