# @mdocui/react

React adapter for [mdocui](https://github.com/mdocui/mdocui) — streaming `Renderer` component, `useRenderer` hook, and 24 theme-neutral UI components for LLM generative UI powered by Markdoc `{% %}` tag syntax.

Part of the [mdocui](https://github.com/mdocui/mdocui) monorepo.

## Install

```bash
npm install @mdocui/react @mdocui/core
```

`@mdocui/core` is a peer dependency.

## Quick Start

```tsx
import { Renderer, useRenderer, defaultComponents, createDefaultRegistry } from '@mdocui/react'

const registry = createDefaultRegistry()

function Chat() {
  const { nodes, meta, isStreaming, push, done, reset } = useRenderer({ registry })

  // Feed chunks from your LLM stream
  async function onStream(reader: ReadableStreamDefaultReader<string>) {
    reset()
    while (true) {
      const { value, done: streamDone } = await reader.read()
      if (streamDone) break
      push(value)
    }
    done()
  }

  return (
    <Renderer
      nodes={nodes}
      isStreaming={isStreaming}
      onAction={(event) => console.log('action:', event)}
    />
  )
}
```

---

## `useRenderer`

Hook that wraps `@mdocui/core`'s `StreamingParser`. Manages parse state in React and returns reactive AST nodes. Automatically batches renders to at most one per frame (~60fps) for smooth streaming performance.

```ts
const { nodes, meta, isStreaming, push, done, reset } = useRenderer({ registry })
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `registry` | `ComponentRegistry` | Component registry from `@mdocui/core` |

### Return value (`UseRendererReturn`)

| Field | Type | Description |
|-------|------|-------------|
| `nodes` | `ASTNode[]` | Current parsed AST |
| `meta` | `ParseMeta` | Parse errors, node count, completion status |
| `isStreaming` | `boolean` | `true` between the first `push` and `done` |
| `push(chunk)` | `(chunk: string) => void` | Feed a text chunk from the LLM stream. Renders are batched via requestAnimationFrame for efficient updates. |
| `replaceContent(content, options?)` | `(content: string, options?: ReplaceContentOptions) => void` | Replace all content at once. Pass `{ streaming: true }` to keep shimmer/pendingTag active (for AG-UI style transports that provide accumulated content). Call `done()` when finished. |
| `done()` | `() => void` | Signal the stream has ended; flushes the parser and performs final render |
| `reset()` | `() => void` | Clear all state for a new conversation turn |

---

## `Renderer`

Renders an `ASTNode[]` tree into React elements using a component map.

```tsx
<Renderer
  nodes={nodes}
  components={defaultComponents}
  onAction={handleAction}
  isStreaming={isStreaming}
  renderProse={(content, key) => <Markdown key={key}>{content}</Markdown>}
/>
```

### Props (`RendererProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodes` | `ASTNode[]` | required | AST from `useRenderer` or `StreamingParser` |
| `components` | `ComponentMap` | all 24 built-ins | Custom components merged on top of defaults (see below) |
| `onAction` | `ActionHandler` | no-op | Callback for interactive events |
| `onError` | `(event: ComponentErrorEvent) => void` | — | Callback when a component throws during render. Receives `{ componentName, error, props }` |
| `isStreaming` | `boolean` | `false` | Whether the LLM is still streaming |
| `registry` | `ComponentRegistry` | — | Optional registry for prop validation warnings (dev aid) |
| `meta` | `ParseMeta` | — | Parse metadata from `useRenderer` — enables shimmer for pending components |
| `renderProse` | `(content: string, key: string) => ReactNode` | built-in `SimpleMarkdown` | Custom renderer for prose nodes (see below) |
| `renderPendingComponent` | `((tag?: string) => ReactNode) \| null` | built-in `ComponentShimmer` | Custom shimmer during streaming. Pass `null` to disable |
| `contextData` | `Record<string, unknown>` | — | App-level data accessible to all components via `useMdocUI()` |
| `classNames` | `Record<string, string>` | — | Per-component CSS class overrides. When a className is provided, decorative inline styles are omitted so your CSS has full control via `[data-mdocui-*]` selectors |

---

## Prop Validation

Pass a `registry` to get `console.warn` messages when the LLM sends invalid props:

```tsx
const registry = createDefaultRegistry()

<Renderer nodes={nodes} registry={registry} />
// console.warn: [mdocui] <chart> invalid props: Expected string, received number
```

Validation only runs **after streaming ends** and only for components registered in the given registry. No performance cost during streaming, no noise for unregistered components.

---

## Streaming Shimmer

When a component tag is being buffered during streaming, the Renderer shows a skeleton placeholder. Pass `meta` from `useRenderer` to enable it:

```tsx
const { nodes, meta, isStreaming } = useRenderer({ registry })

<Renderer nodes={nodes} isStreaming={isStreaming} meta={meta} />
```

Override the shimmer globally:

```tsx
<Renderer
  renderPendingComponent={(tag) => <MyShimmer tagName={tag} />}
/>
```

Disable it:

```tsx
<Renderer renderPendingComponent={null} />
```

---

## Prose Rendering

By default, prose nodes are rendered with the built-in `SimpleMarkdown` component which handles **bold**, *italic*, `inline code`, [links](url), headings (h1-h3), unordered lists, and paragraph breaks — no external dependencies required.

For full GFM support, override with `renderProse`:

```tsx
import ReactMarkdown from 'react-markdown'

<Renderer
  nodes={nodes}
  renderProse={(content, key) => <ReactMarkdown key={key}>{content}</ReactMarkdown>}
/>
```

Any markdown library works -- `react-markdown`, `marked`, `markdown-it`, etc.

---

## Components (24)

All default components are available via `defaultComponents` and registered in `createDefaultRegistry()`.

### Layout (7)

| Component | Tag | Description |
|-----------|-----|-------------|
| Stack | `stack` | Vertical or horizontal flex container. Props: `direction?`, `gap?`, `align?` |
| Grid | `grid` | CSS grid layout. Props: `cols?`, `gap?` |
| Card | `card` | Bordered container. Props: `title?`, `variant?` |
| Divider | `divider` | Horizontal separator line. Self-closing. |
| Accordion | `accordion` | Collapsible section. Props: `title`, `open?` |
| Tabs | `tabs` | Tabbed container. Props: `labels`, `active?` |
| Tab | `tab` | Single tab panel inside `tabs`. Props: `label` |

### Interactive (8)

| Component | Tag | Description |
|-----------|-----|-------------|
| Button | `button` | Action button. Props: `action`, `label`, `variant?`, `disabled?` |
| ButtonGroup | `button-group` | Row of buttons. Props: `direction?` |
| Input | `input` | Text input field. Props: `name`, `label?`, `placeholder?`, `type?`, `required?` |
| Textarea | `textarea` | Multi-line text input. Props: `name`, `label?`, `placeholder?`, `rows?`, `required?` |
| Select | `select` | Dropdown select. Props: `name`, `label?`, `options`, `placeholder?`, `required?` |
| Checkbox | `checkbox` | Toggle checkbox. Props: `name`, `label`, `checked?` |
| Toggle | `toggle` | On/off switch. Props: `name`, `label`, `checked?` |
| Form | `form` | Groups inputs; submits collected state. Props: `name`, `action?` |

### Data (4)

| Component | Tag | Description |
|-----------|-----|-------------|
| Chart | `chart` | Bar, line, pie, or donut chart. Props: `type`, `labels`, `values`, `title?` |
| Table | `table` | Data table. Props: `headers`, `rows`, `caption?` |
| Stat | `stat` | Key metric display. Props: `label`, `value`, `change?`, `trend?` |
| Progress | `progress` | Progress bar. Props: `value`, `label?`, `max?` |

### Content (5)

| Component | Tag | Description |
|-----------|-----|-------------|
| Callout | `callout` | Alert / notice block. Props: `type`, `title?`. Accepts body content. |
| Badge | `badge` | Inline label. Props: `label`, `variant?` |
| Image | `image` | Inline image. Props: `src`, `alt`, `width?`, `height?` |
| CodeBlock | `code-block` | Syntax-highlighted code. Props: `language?`, `title?`, `code` |
| Link | `link` | Action link. Props: `action`, `label`, `url?` |

---

## `ComponentProps`

Every component in the `ComponentMap` receives the same props interface:

```ts
interface ComponentProps {
  name: string                       // tag name, e.g. "button"
  props: Record<string, unknown>     // parsed attributes from the tag
  children?: React.ReactNode         // rendered child nodes (for body tags)
  onAction: ActionHandler            // fire an ActionEvent
  isStreaming: boolean               // whether the LLM is still streaming
}
```

---

## `onAction` Event Handling

Interactive components fire `ActionEvent` objects through the `onAction` callback:

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

```tsx
function handleAction(event: ActionEvent) {
  switch (event.type) {
    case 'button_click':
      if (event.action === 'continue') {
        // Send event.label as a new user message
      }
      break
    case 'form_submit':
      console.log(event.formName, event.formState)
      break
  }
}

<Renderer nodes={nodes} components={defaultComponents} onAction={handleAction} />
```

---

## Error Handling

The `<Renderer>` includes built-in error boundaries that catch component render failures. Use `onError` to log or report errors:

```typescript
interface ComponentErrorEvent {
  componentName: string
  error: Error
  props: Record<string, unknown>
}
```

```tsx
<Renderer
  nodes={nodes}
  onError={(event) => {
    console.error(`Component <${event.componentName}> failed:`, event.error)
    // event.props contains the props that triggered the error
  }}
/>
```

**Error Recovery Behavior:**

- **After successful render**: If a component throws after rendering at least once, the error boundary shows the last successfully rendered output instead of an error message, providing graceful degradation.
- **On first-render failure**: If a component fails on its initial render, a simple error message is shown.
- **Re-throw safe**: The last-valid snapshot is rendered through an inner error boundary. If the snapshot also throws, the inner boundary catches it and shows the error fallback instead of looping.

This keeps the UI stable during streaming and component updates.

---

## Custom Components

Pass custom components via the `components` prop — they merge on top of the 24 built-in defaults. You only need to pass overrides, not the full map:

```tsx
import type { ComponentProps } from '@mdocui/react'

function MyCard({ props, children }: ComponentProps) {
  return (
    <div className="my-card">
      {props.title && <h3>{props.title as string}</h3>}
      {children}
    </div>
  )
}

// MyCard replaces the built-in card; all other 23 components still work
<Renderer nodes={nodes} components={{ card: MyCard }} />
```

---

## Context Data

Pass app-level data to components without prop drilling. Useful for brand colors, account info, router, or any data the LLM doesn't generate:

```tsx
<Renderer
  nodes={nodes}
  contextData={{ brandColor: '#E8845C', accountName: 'Acme Corp' }}
/>
```

Components access it via `useMdocUI()`:

```tsx
function MyChart({ props }: ComponentProps) {
  const { contextData } = useMdocUI()
  const color = (contextData?.brandColor as string) ?? 'currentColor'
  return <div style={{ color }}>{/* chart */}</div>
}
```

---

## Context

`useMdocUI()` provides the renderer context from inside any component in the tree:

```ts
import { useMdocUI } from '@mdocui/react'

function MyComponent() {
  const { onAction, isStreaming, contextData } = useMdocUI()
  // ...
}
```

Must be used inside a `<Renderer />`.

---

## License

See the root [mdocui](https://github.com/mdocui/mdocui) repository for license details.
