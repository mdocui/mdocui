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

Opens a browser UI where you type mdocUI markup on the left and inspect parsed output on the right. Use **Play stream**/**Pause stream**, **Step**, and **Restart** to replay input in chunks; choose chunk size or seek with the progress slider. AST and parser-state panels show nodes, open or pending tags, completion state, and errors. **Restart** returns to chunk zero paused; **Play stream** resumes playback. Replay flushes the parser only at the end.

The **Sample** selector includes split-delimiter and open-body examples, loaded paused with one-character chunks. The open-body sample intentionally ends without a closing tag so the final flush reports an unclosed-tag warning.

Replay accepts at most 16,384 characters (UTF-16 code units) and 2,048 chunks. If input exceeds these limits, shorten it or increase chunk size. Normal live parsing remains available up to the existing 1 MB request-body limit.

If the current working directory contains `mdocui.config.ts`, `mdocui.config.js`, or `mdocui.config.mjs`, preview uses its `components` list to identify known tags. Without a config, all tags are accepted.

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
