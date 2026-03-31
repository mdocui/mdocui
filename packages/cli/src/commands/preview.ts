import http from 'node:http'
import type { ASTNode } from '@mdocui/core'
import { StreamingParser } from '@mdocui/core'
import { loadConfig } from '../config'

export interface PreviewOptions {
	port?: number
}

export async function preview(cwd: string, options?: PreviewOptions) {
	const port = options?.port ?? 4321
	let knownTags: Set<string> | undefined

	try {
		const config = await loadConfig(cwd)
		knownTags = new Set(config.components.map((c) => c.name))
		console.log(`Loaded config with ${knownTags.size} components: ${[...knownTags].join(', ')}`)
	} catch {
		console.log('No config found — all tags treated as known')
	}

	const MAX_BODY_SIZE = 1024 * 1024 // 1MB

	const server = http.createServer((req, res) => {
		if (req.method === 'POST' && req.url === '/api/parse') {
			let body = ''
			let size = 0
			let aborted = false
			req.on('data', (chunk: Buffer) => {
				if (aborted) return
				size += chunk.length
				if (size > MAX_BODY_SIZE) {
					aborted = true
					res.writeHead(413, { 'Content-Type': 'application/json' })
					res.end(JSON.stringify({ error: 'Request body too large (max 1MB)' }))
					req.destroy()
					return
				}
				body += chunk.toString()
			})
			req.on('end', () => {
				if (aborted) return
				try {
					const { content } = JSON.parse(body) as { content: string }
					const parser = new StreamingParser(
						knownTags ? { knownTags, dropUnknown: false } : undefined,
					)
					parser.write(content)
					parser.flush()
					const nodes: ASTNode[] = parser.getNodes()
					const meta = parser.getMeta()

					res.writeHead(200, { 'Content-Type': 'application/json' })
					res.end(JSON.stringify({ nodes, meta }))
				} catch (err) {
					res.writeHead(400, { 'Content-Type': 'application/json' })
					res.end(JSON.stringify({ error: (err as Error).message }))
				}
			})
			return
		}

		if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
			res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
			res.end(buildHTML(knownTags))
			return
		}

		res.writeHead(404, { 'Content-Type': 'text/plain' })
		res.end('Not found')
	})

	server.listen(port, '127.0.0.1', () => {
		console.log(`\nmdocui preview server running at:\n`)
		console.log(`  http://localhost:${port}\n`)
		console.log('Press Ctrl+C to stop.\n')
	})
}

function buildHTML(knownTags?: Set<string>): string {
	const tagList = knownTags ? JSON.stringify([...knownTags]) : '[]'

	return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>mdocui preview</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0a0a0a;
  --bg-surface: #141414;
  --bg-surface-2: #1e1e1e;
  --border: #2a2a2a;
  --text: #e4e4e4;
  --text-dim: #888;
  --accent: #7c6bff;
  --accent-dim: #5a4fbb;
  --error: #f06;
  --tag-bg: #1a1a2e;
  --tag-border: #2a2a4e;
  --prose-bg: #0f1a0f;
  --prose-border: #1a3a1a;
  --font-mono: 'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, monospace;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

html, body { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font-sans); }

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
}

header h1 {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--accent);
}

header .meta {
  font-size: 12px;
  color: var(--text-dim);
}

.panels {
  display: flex;
  flex: 1;
  min-height: 0;
}

.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.panel + .panel {
  border-left: 1px solid var(--border);
}

.panel-header {
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-dim);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
}

textarea {
  flex: 1;
  width: 100%;
  padding: 16px;
  background: var(--bg);
  color: var(--text);
  border: none;
  resize: none;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  outline: none;
  tab-size: 2;
}

textarea::placeholder { color: var(--text-dim); }

.preview {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: var(--bg);
}

/* AST node rendering */

.node-prose {
  background: var(--prose-bg);
  border: 1px solid var(--prose-border);
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.7;
}

.node-prose p { margin-bottom: 0.5em; }
.node-prose p:last-child { margin-bottom: 0; }
.node-prose strong { color: #fff; }
.node-prose em { color: #ccc; font-style: italic; }
.node-prose code {
  background: var(--bg-surface-2);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 12px;
}
.node-prose a { color: var(--accent); text-decoration: underline; }
.node-prose ul, .node-prose ol { padding-left: 1.5em; margin-bottom: 0.5em; }
.node-prose h1, .node-prose h2, .node-prose h3 {
  color: #fff;
  margin-bottom: 0.4em;
}
.node-prose h1 { font-size: 1.4em; }
.node-prose h2 { font-size: 1.2em; }
.node-prose h3 { font-size: 1.05em; }

.node-component {
  background: var(--tag-bg);
  border: 1px solid var(--tag-border);
  border-radius: 6px;
  margin-bottom: 8px;
  overflow: hidden;
}

.node-component-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(124, 107, 255, 0.08);
  border-bottom: 1px solid var(--tag-border);
}

.node-component-name {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}

.node-component-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--accent-dim);
  color: #fff;
}

.node-component-props {
  padding: 8px 12px;
}

.prop-row {
  display: flex;
  gap: 8px;
  font-size: 12px;
  font-family: var(--font-mono);
  padding: 2px 0;
}

.prop-key { color: #82aaff; }
.prop-eq { color: var(--text-dim); }
.prop-val { color: #c3e88d; }

.node-component-children {
  padding: 8px 12px;
  border-top: 1px solid var(--tag-border);
}

.node-component-children-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-dim);
  margin-bottom: 6px;
}

.errors {
  padding: 8px 16px;
  background: rgba(255, 0, 102, 0.08);
  border-top: 1px solid rgba(255, 0, 102, 0.2);
}

.error-item {
  font-size: 12px;
  color: var(--error);
  font-family: var(--font-mono);
  padding: 2px 0;
}

.error-item::before { content: '\\26A0  '; }

.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 16px;
  font-size: 11px;
  color: var(--text-dim);
  border-top: 1px solid var(--border);
  background: var(--bg-surface);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-dim);
  font-size: 13px;
  text-align: center;
  line-height: 1.8;
}
</style>
</head>
<body>
<div class="app">
  <header>
    <h1>mdocui preview</h1>
    <span class="meta" id="tag-count"></span>
  </header>
  <div class="panels">
    <div class="panel">
      <div class="panel-header">Input</div>
      <textarea id="editor" spellcheck="false" placeholder="Type mdocUI markup here...

Example:
Here is a **weather card**:

{% WeatherCard city=&quot;San Francisco&quot; temp=72 unit=&quot;F&quot; /%}

Or with body content:

{% Alert type=&quot;info&quot; %}
This is an informational alert with **markdown** inside.
{% /Alert %}"></textarea>
    </div>
    <div class="panel">
      <div class="panel-header">Preview</div>
      <div class="preview" id="preview">
        <div class="empty-state">Start typing mdocUI markup<br/>to see the live preview</div>
      </div>
      <div class="errors" id="errors" style="display:none"></div>
    </div>
  </div>
  <div class="status-bar">
    <span id="status">Ready</span>
    <span id="node-count"></span>
  </div>
</div>

<script>
(function() {
  const knownTags = ${tagList};
  const editor = document.getElementById('editor');
  const preview = document.getElementById('preview');
  const errors = document.getElementById('errors');
  const status = document.getElementById('status');
  const nodeCount = document.getElementById('node-count');
  const tagCountEl = document.getElementById('tag-count');

  if (knownTags.length > 0) {
    tagCountEl.textContent = knownTags.length + ' registered component' + (knownTags.length === 1 ? '' : 's');
  } else {
    tagCountEl.textContent = 'no config — all tags accepted';
  }

  let timer = null;

  editor.addEventListener('input', function() {
    clearTimeout(timer);
    timer = setTimeout(parse, 150);
  });

  // also handle paste
  editor.addEventListener('paste', function() {
    clearTimeout(timer);
    timer = setTimeout(parse, 50);
  });

  async function parse() {
    const content = editor.value;
    if (!content.trim()) {
      preview.innerHTML = '<div class="empty-state">Start typing mdocUI markup<br/>to see the live preview</div>';
      errors.style.display = 'none';
      status.textContent = 'Ready';
      nodeCount.textContent = '';
      return;
    }

    status.textContent = 'Parsing...';

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();

      if (data.error) {
        status.textContent = 'Error: ' + data.error;
        return;
      }

      preview.innerHTML = renderNodes(data.nodes);
      nodeCount.textContent = data.meta.nodeCount + ' node' + (data.meta.nodeCount === 1 ? '' : 's');

      if (data.meta.errors && data.meta.errors.length > 0) {
        errors.style.display = 'block';
        errors.innerHTML = data.meta.errors
          .map(function(e) { return '<div class="error-item">' + escapeHtml(e.message) + '</div>'; })
          .join('');
        status.textContent = 'Parsed with ' + data.meta.errors.length + ' warning(s)';
      } else {
        errors.style.display = 'none';
        status.textContent = 'OK';
      }
    } catch (err) {
      status.textContent = 'Fetch error: ' + err.message;
    }
  }

  function renderNodes(nodes) {
    if (!nodes || nodes.length === 0) return '<div class="empty-state">No nodes parsed</div>';
    return nodes.map(renderNode).join('');
  }

  function renderNode(node) {
    if (node.type === 'prose') {
      return '<div class="node-prose">' + markdownToHtml(node.content) + '</div>';
    }

    if (node.type === 'component') {
      var html = '<div class="node-component">';
      html += '<div class="node-component-header">';
      html += '<span class="node-component-name">' + escapeHtml(node.name) + '</span>';
      if (node.selfClosing) {
        html += '<span class="node-component-badge">self-closing</span>';
      }
      html += '</div>';

      var propKeys = Object.keys(node.props || {});
      if (propKeys.length > 0) {
        html += '<div class="node-component-props">';
        propKeys.forEach(function(key) {
          var val = node.props[key];
          var display = typeof val === 'string' ? '"' + escapeHtml(val) + '"' : String(val);
          html += '<div class="prop-row">';
          html += '<span class="prop-key">' + escapeHtml(key) + '</span>';
          html += '<span class="prop-eq">=</span>';
          html += '<span class="prop-val">' + display + '</span>';
          html += '</div>';
        });
        html += '</div>';
      }

      if (node.children && node.children.length > 0) {
        html += '<div class="node-component-children">';
        html += '<div class="node-component-children-label">Children</div>';
        html += renderNodes(node.children);
        html += '</div>';
      }

      html += '</div>';
      return html;
    }

    return '';
  }

  /** Minimal markdown-to-HTML for prose content */
  function markdownToHtml(text) {
    var html = escapeHtml(text);

    // headings
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // bold + italic
    html = html.replace(/\\*\\*\\*(.+?)\\*\\*\\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
    html = html.replace(/\\*(.+?)\\*/g, '<em>$1</em>');

    // inline code
    html = html.replace(/\`([^\`]+)\`/g, '<code>$1</code>');

    // links — sanitize dangerous protocols
    html = html.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, function(m, text, url) {
      if (/^(https?:\\/\\/|\\/)/.test(url)) return '<a href="' + url + '" target="_blank">' + text + '</a>';
      return text;
    });

    // unordered lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\\/li>\\n?)+/g, function(m) { return '<ul>' + m + '</ul>'; });

    // paragraphs: split on double newlines
    html = html.split(/\\n\\n+/).map(function(block) {
      block = block.trim();
      if (!block) return '';
      if (/^<(h[1-3]|ul|ol|li)/.test(block)) return block;
      return '<p>' + block.replace(/\\n/g, '<br/>') + '</p>';
    }).join('');

    return html;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
</script>
</body>
</html>`
}
