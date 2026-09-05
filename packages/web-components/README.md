# @mdocui/web-components

Custom element renderer for mdocUI. Renders streamed LLM output as real DOM, in any framework or none.

Part of the [mdocui](https://github.com/mdocui/mdocui) monorepo.

## Install

```bash
npm install @mdocui/web-components
```

## Quick Start

Importing the package registers `<mdoc-ui>`.

```html
<script type="module">
  import '@mdocui/web-components'

  const el = document.querySelector('mdoc-ui')

  // stream it
  for await (const chunk of response) el.push(chunk)
  el.done()

  // or set it all at once
  el.markup = 'Revenue grew **12%**\n\n{% chart type="bar" labels=["Q1","Q2"] values=[10,14] /%}'
</script>

<mdoc-ui></mdoc-ui>
```

No framework, no peer dependencies. The only runtime dependency is `@mdocui/core`.

## API

| Member | Description |
|---|---|
| `push(chunk)` | Feed the next chunk of a streaming response |
| `done()` | Close the stream and flush |
| `reset()` | Clear and start again |
| `markup = string` | Replace the content in one go |
| `getNodes()` | The parsed AST |
| `isStreaming` | Whether a stream is open |
| `classNames` | Map of component name to CSS class |
| `components` | Map of component name to your own renderer |
| `registry` | A `ComponentRegistry`; defaults to the built-ins |

### Events

Both bubble.

```js
el.addEventListener('mdocui:action', (e) => {
  e.detail // { type: 'button_click', action: 'go', label: 'Go', ... }
})

el.addEventListener('mdocui:error', (e) => {
  e.detail // { componentName, error, props }
})
```

A component that throws is reported here and skipped; the rest of the message still renders.

### Registering under another name

```js
import { defineMdocUI } from '@mdocui/web-components'
defineMdocUI('my-mdoc')
```

`defineMdocUI` is safe to call twice and does nothing where there is no DOM, so importing this package during a server render will not throw.

## Light DOM

Components render into the element itself, not a shadow root, so page CSS reaches them:

```css
[data-mdocui-card] { border-radius: 12px; }
```

Or pass classes per component, which also drops the default inline styles:

```js
el.classNames = { card: 'my-card', button: 'my-button' }
```

## Streaming

Only the tail of the document is re-rendered as chunks arrive. A component becomes a node once its closing tag lands, so anything interactive is final by the time it reaches the DOM — focus and typed input are never thrown away mid-stream.

The same input produces the same DOM regardless of how it is chunked.

## Accessibility

The same guarantees as `@mdocui/react`: ids unique per instance, controls disabled while streaming, the full ARIA tab pattern with `Home`/`End` and a roving tab stop, charts announcing their data rather than their type, and submitted forms leaving the tab order via `inert`.

Prose is built from text nodes and never assigned as HTML, and link hrefs pass through `sanitizeHref`, so `javascript:` and `data:` URLs render as plain text.

## License

MIT
