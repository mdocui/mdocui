# @mdocui/core

Framework-agnostic streaming parser, component registry, and system prompt generator for LLM generative UI. Parses Markdoc `{% %}` tag syntax from streamed LLM output into a typed AST that any renderer can consume.

Part of the [mdocui](https://github.com/mdocui/mdocui) monorepo.

## Install

```bash
npm install @mdocui/core
```

## Overview

`@mdocui/core` provides three things:

1. **Streaming parser** -- incrementally tokenizes and parses Markdoc tags from chunked text (e.g. an LLM response stream).
2. **Component registry** -- defines available components with Zod schemas so the parser can validate props and the prompt generator can describe them to the model.
3. **Prompt generator** -- turns a registry into a system prompt section that teaches an LLM how to emit mdocUI markup.

### How the parser separates prose from components

The LLM writes a single stream containing both standard markdown and `{% %}` component tags. The parser's job is to split that stream into two node types:

- **Prose nodes** -- everything outside `{% %}` delimiters. This is standard markdown (headings, bold, lists, code blocks, etc.) and is passed through as-is for a markdown renderer to handle.
- **Component nodes** -- everything inside `{% %}` delimiters. The parser extracts the tag name, parses attributes, and validates props against the registry's Zod schemas.

The `{%` sequence never appears in normal prose or fenced code blocks, so the tokenizer can reliably detect tag boundaries character-by-character during streaming -- no lookahead or backtracking required.

---

## API Reference

### `Tokenizer`

Low-level character-by-character tokenizer that splits raw text into `Token` objects. Handles `{% tag %}` boundaries, string quoting, and escape sequences. Most users should use `StreamingParser` instead.

```ts
import { Tokenizer, TokenType } from '@mdocui/core'

const tokenizer = new Tokenizer()

const tokens = tokenizer.write('Hello {% button action="go" label="Click" /%}')
// tokens[0] => { type: 'PROSE', raw: 'Hello ' }
// tokens[1] => { type: 'TAG_SELF_CLOSE', raw: '{% button ... /%}', name: 'button', attrs: 'action="go" label="Click"' }

// Flush any remaining buffer when the stream ends
const remaining = tokenizer.flush()

// Reset for reuse
tokenizer.reset()
```

**Token types:** `PROSE`, `TAG_OPEN`, `TAG_SELF_CLOSE`, `TAG_CLOSE`

**Tokenizer states:** `IN_PROSE`, `IN_TAG`, `IN_STRING`

---

### `StreamingParser`

Incremental parser that converts a stream of text chunks into an `ASTNode[]` tree. Tags are matched by name, nested correctly, and force-closed on flush if unclosed.

```ts
import { StreamingParser } from '@mdocui/core'

const parser = new StreamingParser({
  knownTags: new Set(['card', 'button']),
  dropUnknown: true, // default -- silently drops unknown tags
})

// Feed chunks as they arrive from the LLM
let newNodes = parser.write('Here is a card:\n{% card title="Hello" %}')
newNodes = parser.write('Card body content')
newNodes = parser.write('{% /card %}')

// Finalize -- force-closes any unclosed tags
const finalNodes = parser.flush()

// Access the full AST
const allNodes = parser.getNodes() // ASTNode[]

// Inspect errors and status
const meta = parser.getMeta() // ParseMeta
```

#### `ParserOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `knownTags` | `Set<string>` | `new Set()` (allow all) | Tags the parser accepts. Empty set allows everything. |
| `dropUnknown` | `boolean` | `true` | When `true`, unknown tags are silently dropped. When `false`, they are emitted as prose. |

---

### `ComponentRegistry`

Typed store of component definitions. Used to generate the `knownTags` set for the parser and the system prompt for the LLM.

```ts
import { ComponentRegistry, defineComponent } from '@mdocui/core'
import { z } from 'zod'

const registry = new ComponentRegistry({ coerce: true }) // LLM-friendly mode

registry.register(
  defineComponent({
    name: 'alert',
    description: 'Displays a colored alert box',
    props: z.object({
      severity: z.enum(['info', 'warning', 'error']).describe('Alert severity'),
      title: z.string().optional().describe('Optional heading'),
    }),
    children: 'any',   // 'none' | 'any' | string[]
  })
)

// Batch register
registry.registerAll([alertDef, cardDef])

// Query
registry.has('alert')       // true
registry.get('alert')       // ComponentDefinition | undefined
registry.names()            // ['alert', ...]
registry.all()              // ComponentDefinition[]
registry.knownTags()        // Set<string>

// Validate props against the Zod schema
const result = registry.validate('alert', { severity: 'info' })
// { valid: true, errors: [], props: { severity: 'info' } }
```

#### `RegistryOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `coerce` | `boolean` | `false` | LLM-friendly mode: when validation fails, fall back to raw props instead of rejecting. Built-in definitions use `z.coerce.*` and case-insensitive enums, so most LLM output validates. The fallback is a safety net for edge cases. |

---

### `defineComponent`

Identity helper that returns a `ComponentDefinition` unchanged. Provides type inference when defining components outside a registry.

```ts
import { defineComponent } from '@mdocui/core'
import { z } from 'zod'

export const myComponent = defineComponent({
  name: 'my-component',
  description: 'Does something useful',
  props: z.object({
    value: z.number().describe('A numeric value'),
  }),
  children: 'none',
  streaming: { value: true }, // mark props that can stream partial values
})
```

---

### `generatePrompt`

Generates a complete system prompt from a registry. The prompt merges two layers:

**Library layer** (auto-generated from the registry):
- TAG SYNTAX reference — self-closing and body tag forms
- COMPONENTS list — all registered components with prop types and allowed children
- COMPOSITION rules — nesting examples showing card > grid > stat, form > inputs, etc.
- STREAMING GUIDELINE — prose-before-components rendering advice

**App layer** (your options):
- `preamble` — domain context ("You are an e-commerce assistant...")
- `groups` — organize components under headings with domain-specific notes
- `additionalRules` — domain rules ("Use stat inside grid for KPI dashboards")
- `examples` — domain examples showing expected output format

The final prompt structure:

```
[preamble]              ← your app context
## TAG SYNTAX            ← auto from library
## COMPONENTS            ← auto from registry + your groups
## COMPOSITION           ← auto from library
## STREAMING GUIDELINE   ← auto from library
## RULES                 ← your additionalRules
## EXAMPLE               ← your examples
```

You never write syntax docs or component signatures — `generatePrompt()` handles that from the registry. You only provide domain context and usage guidance.

```ts
import { generatePrompt, ComponentRegistry } from '@mdocui/core'

const registry = new ComponentRegistry()
// ... register components ...

const prompt = generatePrompt(registry, {
  preamble: 'You are a helpful assistant.',
  additionalRules: [
    'Always use a card for structured answers.',
    'Never nest more than 3 levels deep.',
  ],
  examples: [
    '{% card title="Weather" %}\nSunny, 72F\n{% /card %}',
  ],
  groups: [
    {
      name: 'Layout',
      components: ['stack', 'grid', 'card'],
      notes: ['Use stack for vertical/horizontal layouts'],
    },
  ],
})
```

#### `PromptOptions`

| Option | Type | Description |
|--------|------|-------------|
| `preamble` | `string` | Text prepended before the syntax section |
| `additionalRules` | `string[]` | Extra rules appended as a bullet list |
| `examples` | `string[]` | Example markup blocks appended at the end |
| `groups` | `ComponentGroup[]` | Groups components under named headings with optional notes |
| `verbosity` | `'minimal' \| 'default' \| 'detailed'` | Prompt detail level. `minimal` outputs only component signatures (~90% fewer tokens). Default includes syntax docs, composition examples, and streaming guidelines |

---

### `parseAttributes`

Parses the attribute string inside a `{% tag ... %}` into a key-value record. Handles quoted strings (with escape sequences), arrays via JSON `[...]`, bare booleans, numbers, and null. Prototype pollution keys (`__proto__`, `constructor`, `prototype`) are silently skipped.

```ts
import { parseAttributes } from '@mdocui/core'

parseAttributes('action="go" label="Click me" count=42 disabled')
// { action: 'go', label: 'Click me', count: 42, disabled: true }

parseAttributes('options=["a","b","c"] required=true')
// { options: ['a', 'b', 'c'], required: true }
```

---

## Types

### `ASTNode`

```ts
type ASTNode = ProseNode | ComponentNode
```

### `ProseNode`

```ts
interface ProseNode {
  type: 'prose'
  content: string
}
```

### `ComponentNode`

```ts
interface ComponentNode {
  type: 'component'
  name: string
  props: Record<string, unknown>
  children: ASTNode[]
  selfClosing: boolean
}
```

### `ComponentDefinition`

```ts
interface ComponentDefinition {
  name: string
  description: string
  props: z.ZodObject<z.ZodRawShape>
  children?: 'none' | 'any' | string[]
  streaming?: Record<string, boolean>
}
```

### `ActionEvent`

Fired by interactive components in the renderer layer.

```ts
interface ActionEvent {
  type: 'button_click' | 'form_submit' | 'select_change' | 'link_click'
  action: string
  label?: string
  formName?: string
  formState?: Record<string, unknown>
  tagName: string
  params?: Record<string, unknown>
}
```

### `ParseMeta`

Returned by `parser.getMeta()`.

```ts
interface ParseMeta {
  errors: ParseError[]
  nodeCount: number
  isComplete: boolean
  pendingTag?: string    // tag name being buffered (e.g. "chart")
  bufferLength?: number  // bytes buffered for the pending tag
}
```

### `ParseError`

```ts
interface ParseError {
  code: 'unknown_tag' | 'validation' | 'malformed' | 'unclosed'
  tagName: string
  message: string
  raw?: string
}
```

### `ValidationResult`

Returned by `registry.validate()`.

```ts
interface ValidationResult {
  valid: boolean
  errors: string[]
  props?: Record<string, unknown>
}
```

---

## License

See the root [mdocui](https://github.com/mdocui/mdocui) repository for license details.
