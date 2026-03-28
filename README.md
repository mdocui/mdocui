# mdocUI

[![npm core](https://img.shields.io/npm/v/@mdocui/core?label=%40mdocui%2Fcore&color=blue)](https://www.npmjs.com/package/@mdocui/core)
[![npm react](https://img.shields.io/npm/v/@mdocui/react?label=%40mdocui%2Freact&color=blue)](https://www.npmjs.com/package/@mdocui/react)
[![npm cli](https://img.shields.io/npm/v/@mdocui/cli?label=%40mdocui%2Fcli&color=blue)](https://www.npmjs.com/package/@mdocui/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%E2%89%A522-green)](https://nodejs.org/)

Generative UI library for LLMs using Markdoc `{% %}` tag syntax inline with markdown prose.

LLMs write natural markdown **and** drop interactive UI components in the same stream — charts, buttons, forms, tables, cards, and more. No custom DSL to learn, no JSON blocks, no JSX confusion.

```
The Q4 results show strong growth across all segments.

{% chart type="bar" labels=["Jan","Feb","Mar"] values=[120,150,180] /%}

Revenue grew **12%** quarter-over-quarter.

{% callout type="info" title="Action Required" %}
Review the pipeline before end of quarter.
{% /callout %}

{% button action="continue" label="Show by region" /%}
{% button action="continue" label="Export as PDF" /%}
```

## Why mdocUI?

| Approach | Prose? | Components? | Streaming? | Token efficient? |
|----------|--------|-------------|------------|------------------|
| Plain markdown | Yes | No | Yes | Yes |
| OpenUI Lang | No | Yes | Yes | Yes |
| JSON blocks in markdown | Yes | Yes | Fragile | No |
| JSX in markdown | Yes | Yes | Fragile | No |
| **mdocUI** | **Yes** | **Yes** | **Yes** | **Yes** |

Markdoc's `{% %}` delimiters are unambiguous — they never appear in normal prose or code, making streaming parsing reliable.

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| [`@mdocui/core`](packages/core) | Streaming parser, tokenizer, component registry, prompt generator | Stable |
| [`@mdocui/react`](packages/react) | React renderer, 22 default components, `useRenderer` hook | Stable |
| [`@mdocui/cli`](packages/cli) | Scaffold, generate system prompts, preview | Stable |

## Quick Start

```bash
pnpm add @mdocui/core @mdocui/react
```

### 1. Define components and generate a system prompt

```typescript
import { generatePrompt } from '@mdocui/core'
import { createDefaultRegistry, defaultGroups } from '@mdocui/react'

const registry = createDefaultRegistry()
const systemPrompt = generatePrompt(registry, {
  preamble: 'You are a helpful assistant.',
  groups: defaultGroups,
})
// Pass systemPrompt to your LLM
```

### 2. Render streamed output

```tsx
import { useRenderer } from '@mdocui/react'
import { Renderer, defaultComponents, createDefaultRegistry } from '@mdocui/react'

const registry = createDefaultRegistry()

function Chat() {
  const { nodes, isStreaming, push, done } = useRenderer({ registry })

  // Call push(chunk) as tokens arrive from LLM
  // Call done() when stream ends

  return (
    <Renderer
      nodes={nodes}
      components={defaultComponents}
      isStreaming={isStreaming}
      onAction={(event) => {
        if (event.action === 'continue') {
          sendMessage(event.label)
        }
      }}
    />
  )
}
```

### 3. Handle actions

Every interactive component fires through a single `onAction` callback:

```typescript
onAction={(event) => {
  switch (event.action) {
    case 'continue':
      // Send event.label as a new user message
      break
    case 'submit:formName':
      // event.formState has all field values
      break
    case 'open_url':
      // event.params.url has the URL
      break
  }
}}
```

## Custom Components

Every component receives `ComponentProps` and can be swapped:

```typescript
interface ComponentProps {
  name: string
  props: Record<string, unknown>
  children?: React.ReactNode
  className?: string
  onAction: ActionHandler
  isStreaming: boolean
}
```

### Override specific components

```tsx
import { defaultComponents, Renderer } from '@mdocui/react'

const myComponents = {
  ...defaultComponents,
  button: MyButton,     // swap just the button
  card: MyShadcnCard,   // use your shadcn card
}

<Renderer nodes={nodes} components={myComponents} />
```

### Tailwind / className support

Pass per-component classes via `classNames`:

```tsx
<Renderer
  nodes={nodes}
  components={defaultComponents}
  classNames={{
    button: 'bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2',
    card: 'border border-gray-200 rounded-xl p-6 shadow-sm',
    callout: 'border-l-4 pl-4 py-3',
  }}
/>
```

### Bring your own components entirely

```tsx
const shadcnComponents = {
  button: ({ props, onAction }) => (
    <Button onClick={() => onAction({ type: 'button_click', action: props.action, label: props.label, tagName: 'button' })}>
      {props.label}
    </Button>
  ),
  card: ({ props, children }) => (
    <Card><CardHeader>{props.title}</CardHeader><CardContent>{children}</CardContent></Card>
  ),
}

<Renderer nodes={nodes} components={shadcnComponents} />
```

## Architecture

```
LLM token stream
      |
  Tokenizer --- character-by-character, tracks IN_PROSE / IN_TAG / IN_STRING
      |
  StreamingParser --- buffers incomplete tags, emits ASTNode[]
      |
  ComponentRegistry --- validates tag names + props via Zod schemas
      |
  Renderer --- maps AST nodes to React components (or Vue, Svelte, etc.)
      |
  Live UI
```

The core is framework-agnostic. `@mdocui/react` is one adapter — Vue, Svelte, and Angular adapters can follow the same pattern.

## Available Components

### Layout
`stack` `grid` `card` `divider` `accordion` `tabs` `tab`

### Interactive
`button` `button-group` `input` `select` `checkbox` `form`

### Data
`chart` `table` `stat` `progress`

### Content
`callout` `badge` `image` `code-block` `link`

All components are bare-bone semantic HTML with `data-mdocui-*` attributes. Style them however you want — CSS, Tailwind, CSS-in-JS, or swap in your own component map entirely.

## Development

```bash
# Install
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint

# Run playground
pnpm playground
```

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-change`)
3. Make your changes with tests
4. Run `pnpm test && pnpm lint`
5. Open a pull request

## License

[MIT](LICENSE)
