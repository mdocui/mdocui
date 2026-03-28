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

Scaffold a new mdocUI config file with starter components.

```bash
npx @mdocui/cli init
```

Creates:
- `mdocui.config.ts` — component definitions and config
- `generated/` — output directory for system prompts

### `generate`

Generate a system prompt from your component registry and write it to a file.

```bash
npx @mdocui/cli generate
```

Reads `mdocui.config.ts` and writes the prompt to the configured `output` path (default: `system-prompt.txt`).

### `preview`

Print the generated system prompt to stdout for review.

```bash
npx @mdocui/cli preview
```

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
