# mdocUI — Implementation Skill for AI Agents

> This file teaches AI coding agents (Claude Code, Cursor, Copilot, etc.) how to implement with mdocUI.
> Install in Claude Code: copy this file to your project's `.claude/` directory or reference it in CLAUDE.md.

## What is mdocUI

mdocUI is a generative UI library for LLMs. It uses Markdoc `{% %}` tag syntax inline with markdown prose. The LLM writes natural markdown AND drops interactive UI components in the same stream.

**npm packages:**
- `@mdocui/core` — streaming parser, component registry, prompt generator
- `@mdocui/react` — React renderer, 24 theme-neutral components
- `@mdocui/cli` — scaffold, generate system prompts, preview

## Installation

```bash
pnpm add @mdocui/core @mdocui/react
```

## Core Concepts

### 1. The LLM generates this syntax

```
Here are the results.

{% chart type="bar" labels=["Q1","Q2","Q3"] values=[100,150,200] title="Revenue" /%}

{% callout type="info" title="Note" %}
Revenue is trending up.
{% /callout %}

{% button action="continue" label="Show details" /%}
```

Self-closing tags: `{% tagname attr="value" /%}`
Body tags: `{% tagname %} content {% /tagname %}`

### 2. System prompt is auto-generated

```typescript
import { ComponentRegistry, generatePrompt, allDefinitions, defaultGroups } from '@mdocui/core'

const registry = new ComponentRegistry()
registry.registerAll(allDefinitions)

const systemPrompt = generatePrompt(registry, {
  preamble: 'You are a helpful assistant.',      // your domain context
  groups: defaultGroups,                          // component organization
  additionalRules: ['Use charts for data'],       // domain-specific guidance
  examples: ['{% chart type="bar" ... /%}'],      // expected output format
  verbosity: 'default',                           // 'minimal' | 'default' | 'detailed'
})
// Pass systemPrompt as the system message to your LLM
```

`allDefinitions` and `defaultGroups` are exported from both `@mdocui/core` and `@mdocui/react`.

The prompt merges two layers:
- **Library layer** (auto): tag syntax, component signatures, composition rules
- **App layer** (yours): preamble, rules, examples, groups

The `verbosity` option controls prompt size: `minimal` (compact, tag names only), `default` (signatures + basic rules), `detailed` (full descriptions + examples).

### 3. Render with React

```tsx
import { Renderer, defaultComponents, useRenderer, createDefaultRegistry } from '@mdocui/react'

const registry = createDefaultRegistry()

function Chat() {
  const { nodes, isStreaming, push, done, meta } = useRenderer({ registry })

  // Feed LLM chunks: push(chunk)
  // When stream ends: done()

  return (
    <Renderer
      nodes={nodes}
      components={defaultComponents}
      registry={registry}                // enables Zod prop validation after stream ends
      isStreaming={isStreaming}
      meta={meta}                        // enables shimmer placeholders for pending tags
      contextData={{ userId: '123' }}    // arbitrary data passed to all components
      classNames={{ button: 'bg-blue-600 text-white', card: 'border-zinc-700' }}
      onAction={(event) => {
        if (event.action === 'continue') sendMessage(event.label)
      }}
      renderProse={(text, key) => <ReactMarkdown key={key}>{text}</ReactMarkdown>}
      renderPendingComponent={(pendingTag) => <MyShimmer tag={pendingTag} />}  // or null to disable
    />
  )
}
```

### 4. Style with classNames (not in the library)

The library renders theme-neutral HTML. The app controls all colors:

```tsx
<Renderer
  classNames={{
    button: 'bg-blue-600 text-white rounded-lg',
    card: 'border border-zinc-200 rounded-xl shadow-sm',
    callout: 'border-l-4 border-blue-500 bg-blue-50',
    chart: 'my-chart-class',
  }}
/>
```

Or override via CSS targeting `data-mdocui-*` attributes:

```css
[data-mdocui-chart-bar] { background: #3b82f6 !important; }
[data-mdocui-button] { background: #0f172a; color: white; }
```

### 5. Custom components

Override any component or bring your own:

```tsx
const myComponents = {
  ...defaultComponents,
  button: MyButton,      // swap one
  card: MyShadcnCard,    // use shadcn
}

<Renderer components={myComponents} />
```

Every component receives `ComponentProps`:

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

## Renderer Props

```typescript
interface RendererProps {
  nodes: ASTNode[]                    // parsed AST from useRenderer
  components?: ComponentMap           // component map (default: defaultComponents)
  registry?: ComponentRegistry        // enables Zod prop validation after streaming
  onAction?: ActionHandler            // single callback for all interactions
  isStreaming?: boolean               // true while LLM is still streaming
  meta?: ParseMeta                    // parser metadata (enables shimmer for pending tags)
  contextData?: Record<string, unknown>  // arbitrary data passed to all components
  renderProse?: (content: string, key: string) => React.ReactNode
  renderPendingComponent?: ((pendingTag?: string) => React.ReactNode) | null  // custom shimmer, or null to disable
  classNames?: Record<string, string> // per-component Tailwind/CSS classes
}
```

## Available Components (24)

### Layout
- `stack` — flex container (direction, gap, align)
- `grid` — CSS grid (cols, gap)
- `card` — bordered container (title, variant)
- `divider` — horizontal line
- `accordion` — collapsible section (title, open)
- `tabs` — tabbed container (labels, active) — children: tab only
- `tab` — tab panel (label)

### Interactive
- `button` — action button (action, label, variant) — disables after click
- `button-group` — button row (direction) — children: button only
- `input` — text field (name, label, placeholder, type)
- `textarea` — multi-line input (name, label, placeholder, rows)
- `select` — dropdown (name, label, options, placeholder)
- `checkbox` — toggle (name, label, checked)
- `toggle` — switch (name, label, checked)
- `form` — form container (name) — children: input, textarea, select, checkbox, toggle, button

### Data
- `chart` — visualization (type: bar|line|pie|donut, labels, values, title)
- `table` — data table (headers, rows, caption)
- `stat` — metric display (label, value, change, trend: up|down|neutral)
- `progress` — progress bar (value, label, max)

### Content
- `callout` — alert block (type: info|warning|error|success, title)
- `badge` — inline tag (label, variant)
- `image` — image (src, alt, width, height)
- `code-block` — code block (code, language, title)
- `link` — clickable link (action, label, url)

## Composition Patterns

Nest layout components to build rich dashboards:

```
{% card title="Dashboard" %}
  {% grid cols=3 %}
    {% stat label="Revenue" value="$12K" change="+8%" trend="up" /%}
    {% stat label="Orders" value="284" change="+12%" trend="up" /%}
    {% stat label="AOV" value="$43" change="-2%" trend="down" /%}
  {% /grid %}
{% /card %}

{% card title="Trends" %}
  {% chart type="bar" labels=["Mon","Tue","Wed"] values=[100,150,200] /%}
{% /card %}

{% tabs labels=["By Region","By Channel"] %}
  {% tab label="By Region" %}
    {% table headers=["Region","Revenue"] rows=[["US","$8K"],["EU","$4K"]] /%}
  {% /tab %}
  {% tab label="By Channel" %}
    {% chart type="pie" labels=["Direct","Social","Email"] values=[45,30,25] /%}
  {% /tab %}
{% /tabs %}
```

## Action Handling

```typescript
onAction={(event) => {
  // event.type: 'button_click' | 'form_submit' | 'select_change' | 'link_click'
  // event.action: string identifier
  // event.label: button/link text
  // event.formState: form field values (on submit)
  // event.params: extra data (e.g. { url } for links)

  if (event.action === 'continue') sendMessage(event.label)
  if (event.action.startsWith('submit:')) sendMessage(JSON.stringify(event.formState))
  if (event.action === 'open_url') window.open(event.params.url, '_blank')
}}
```

## Streaming API Route (Next.js)

```typescript
import { ComponentRegistry, generatePrompt, allDefinitions, defaultGroups } from '@mdocui/core'

const registry = new ComponentRegistry()
registry.registerAll(allDefinitions)
const systemPrompt = generatePrompt(registry, { preamble: '...', groups: defaultGroups })

export async function POST(req: Request) {
  const { messages } = await req.json()
  // Pass systemPrompt as system message to any LLM
  // Stream response as text/plain — the client parser handles the rest
}
```

## Common Patterns

### Grid whitespace fix

The streaming parser emits whitespace prose nodes between component tags. Inside a `grid`, these take up grid cells and break layout. Fix by skipping whitespace-only prose:

```tsx
renderProse={(text, key) => {
  if (!text.trim()) return null
  return (
    <div key={key}>
      <SimpleMarkdown content={text} dataKey={key} />
    </div>
  )
}}
```

Or via CSS as a fallback:

```css
[data-mdocui-grid] > div:has(> [data-mdocui-prose]:only-child) {
  display: none !important;
}
```

### Product card layout (PLP/PDP)

Compose existing components for shopping-style product cards:

```
{% grid cols=3 %}
{% card %}
{% image src="https://example.com/shoe.jpg" alt="Running Shoe" /%}

**Running Shoe Pro**

**$149.99** · 4.8★ · {% badge label="In Stock" variant="success" /%}

Lightweight mesh with responsive cushioning.

{% button action="continue" label="View Running Shoe Pro" variant="primary" /%}
{% /card %}
{% /grid %}
```

Use prose for price/rating (not `stat` — it renders too large for product cards). Include the product name in button labels so follow-up messages have context.

### Styling via CSS data attributes

All components render `data-mdocui-*` attributes. Style them globally without classNames:

```css
[data-mdocui-card] { border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
[data-mdocui-stat][data-trend="up"] > div:last-child { color: #16a34a; }
[data-mdocui-stat][data-trend="down"] > div:last-child { color: #dc2626; }
[data-mdocui-callout][data-type="warning"] { background: #fffbeb; border-left-color: #d97706; }
[data-mdocui-badge][data-variant="success"] { background: #dcfce7; color: #15803d; }
```

### Disable shimmer flicker

The built-in shimmer flickers during streaming because `pendingTag` toggles rapidly as each tag opens/closes. Disable it and use a simple typing indicator instead:

```tsx
<Renderer renderPendingComponent={null} />
```

## Built-in Prose Rendering (SimpleMarkdown)

`SimpleMarkdown` is a zero-dependency markdown renderer for prose nodes. Supports:
- **Inline**: bold (`**`), italic (`*`), bold+italic (`***`), strikethrough (`~~`), inline code, links
- **Block**: headings (h1-h3), unordered lists (`-`/`*`), ordered lists (`1.`/`1)`), paragraphs

Headings and lists are detected line-by-line — no blank line separation required.

Override with a full markdown renderer if you need GFM tables, images, or nested lists:

```tsx
<Renderer
  renderProse={(text, key) => <ReactMarkdown key={key}>{text}</ReactMarkdown>}
/>
```

To skip rendering whitespace-only prose (fixes grid layout issues with whitespace nodes):

```tsx
renderProse={(text, key) => {
  if (!text.trim()) return null
  return <SimpleMarkdown content={text} dataKey={key} />
}}
```

## Key Principles

1. **LLM generates structure, client handles styling** — never put colors in the system prompt
2. **Prose + components in one stream** — markdown flows naturally, {% %} tags add interactivity
3. **Single source of truth** — Zod schemas drive both validation AND prompt generation
4. **Theme-neutral defaults** — components use currentColor/inherit, app decides colors via classNames
5. **One-shot interactions** — buttons disable after click, forms lock after submit
6. **Consecutive buttons auto-group inline** — no layout work needed

## Links

- GitHub: https://github.com/mdocui/mdocui
- npm: https://www.npmjs.com/org/mdocui
- Docs: https://mdocui.github.io
- Examples: https://github.com/mdocui/examples
- Live Demo: https://mdocui.vercel.app
