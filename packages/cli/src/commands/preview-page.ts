export function buildHTML(knownTags?: Set<string>): string {
	const tagList = JSON.stringify(knownTags ? [...knownTags] : []).replace(/</g, '\\u003c')

	return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>mdocui preview</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  color-scheme: dark;
  --bg: #111111;
  --bg-surface: #111111;
  --bg-surface-2: #1c1c1e;
  --border: #2b2b2d;
  --text: #e5e5e7;
  --text-dim: #8e8e93;
  --accent: #4b7dff;
  --accent-dim: #365fca;
  --focus: #4b7dff;
  --error: #ff453a;
  --tag-bg: #171719;
  --tag-border: #2c2c2e;
  --prose-bg: #141816;
  --prose-border: #2a3430;
  --font-mono: 'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, monospace;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

html, body { min-height: 100%; background: var(--bg); color: var(--text); font-family: var(--font-sans); }
body { min-height: 100vh; }
button, select, textarea, input { font: inherit; }
:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 0;
  overflow: hidden;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 58px;
  padding: 10px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
}

header h1 {
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.04em;
  color: var(--text);
}
.brand-suffix { color: var(--text-dim); }

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
  min-height: 0;
}

.panel-resizer + .panel {
  border-left: 1px solid var(--border);
}

.panel-resizer { display: grid; flex: 0 0 24px; place-items: center; cursor: col-resize; touch-action: none; outline: none; background: var(--bg-surface); z-index: 1; }
.panel-resizer::after { content: ''; width: 4px; height: 36px; border-radius: 4px; background: var(--text-dim); opacity: .65; }
.panel-resizer:hover::after, .panel-resizer:focus-visible::after { background: var(--accent); opacity: 1; }
.panel-header {
  padding: 11px 16px;
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
  min-height: 0;
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
  background: rgba(75, 125, 255, 0.08);
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
.streaming-placeholder { padding: 10px 12px; color: var(--text-dim); font-size: 12px; }

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

.inspectors {
  display: flex;
  flex: none;
  align-items: stretch;
  gap: 10px;
  height: 210px;
  min-height: 100px;
  max-height: 65vh;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  background: #111111;
  overflow: hidden;
}
.inspector-resizer { display: grid; flex: none; place-items: center; height: 24px; cursor: row-resize; touch-action: none; outline: none; }
.inspector-resizer::after { content: ''; width: 36px; height: 4px; border-radius: 4px; background: var(--text-dim); opacity: .65; }
.inspector-resizer:hover::after, .inspector-resizer:focus-visible::after { background: var(--accent); opacity: 1; }
.replay, .inspectors { border-top: 1px solid var(--border); background: var(--bg-surface); }
.replay { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 20px; font-size: 13px; }
.replay-actions { display: flex; align-items: center; gap: 8px; }
.replay button, .replay select { min-height: 40px; padding: 7px 12px; color: var(--text); background: var(--bg-surface-2); border: 1px solid var(--border); border-radius: 7px; }
.replay button { cursor: pointer; font-size: 12px; font-weight: 600; }
.replay button:disabled { cursor: wait; opacity: .5; }
.replay button:hover:not(:disabled) { border-color: var(--accent); background: #242426; }
.replay #replay-play { background: var(--accent-dim); border-color: var(--accent-dim); color: #fff; }
.replay-primary, .replay-action { display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
.replay-primary svg, .replay-action svg { width: 16px; height: 16px; }
.replay label { display: flex; align-items: center; gap: 7px; color: var(--text-dim); font-size: 12px; }
.replay select { appearance: none; padding-right: 34px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23aeb7c5' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; background-size: 14px; }
#replay-seek { appearance: none; flex: 1; min-width: 100px; height: 24px; padding: 0; background: transparent; cursor: pointer; }
#replay-seek::-webkit-slider-runnable-track { height: 6px; border-radius: 99px; background: linear-gradient(90deg, var(--accent) 0 var(--seek-progress, 0%), var(--border) var(--seek-progress, 0%) 100%); }
#replay-seek::-webkit-slider-thumb { appearance: none; width: 16px; height: 16px; margin-top: -5px; border: 2px solid var(--bg); border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 2px var(--accent); transition: box-shadow .15s, transform .15s; }
#replay-seek:hover::-webkit-slider-thumb { transform: scale(1.12); box-shadow: 0 0 0 5px var(--accent-dim); }
#replay-seek::-moz-range-track { height: 6px; border-radius: 99px; background: var(--border); }
#replay-seek::-moz-range-progress { height: 6px; border-radius: 99px; background: var(--accent); }
#replay-seek::-moz-range-thumb { width: 12px; height: 12px; border: 2px solid var(--bg); border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 2px var(--accent); }
#replay-seek:focus-visible { outline: 2px solid var(--focus); outline-offset: 4px; }
#replay-progress { min-width: 90px; text-align: right; color: var(--text-dim); font-size: 12px; font-variant-numeric: tabular-nums; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.inspectors section { display: flex; flex: 1; flex-direction: column; min-width: 0; min-height: 0; }
.inspectors h2 { flex: none; margin-bottom: 8px; font-size: 10px; letter-spacing: .08em; color: var(--text-dim); text-transform: uppercase; }
.inspectors pre { flex: 1; min-height: 0; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; font: 11px/1.6 var(--font-mono); color: #bdc8d8; }

.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 20px;
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
@media (max-width: 760px) {
  header { padding-inline: 16px; }
  .app { height: auto; min-height: 100vh; overflow: visible; }
  .panels { flex: none; flex-direction: column; }
  .panel { min-height: 320px; }
  .panel-resizer { display: none; }
  .panel-resizer + .panel { border-left: 0; border-top: 1px solid var(--border); }
  .replay { padding: 10px 12px; gap: 8px; }
  .replay-actions { gap: 6px; }
  #replay-seek { order: 1; flex-basis: 100%; }
  #replay-progress { margin-left: auto; min-width: 72px; font-size: 11px; }
  .inspectors { height: 240px; min-height: 140px; max-height: 65vh; flex-direction: column; }
  .inspectors section { min-height: 0; }
  .inspectors pre { max-height: none; flex: 1; min-height: 0; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
</style>
</head>
<body>
<div class="app">
  <header>
    <h1 aria-label="mdocUI"><span>mdoc</span><span class="brand-suffix">UI</span></h1>
    <span class="meta" id="tag-count"></span>
  </header>
  <div class="panels">
    <div class="panel" id="input-panel">
      <div class="panel-header">Input</div>
      <textarea id="editor" aria-label="mdocUI markup" spellcheck="false" placeholder="Type mdocUI markup here...

Example:
Here is a **weather card**:

{% WeatherCard city=&quot;San Francisco&quot; temp=72 unit=&quot;F&quot; /%}

Or with body content:

{% Alert type=&quot;info&quot; %}
This is an informational alert with **markdown** inside.
{% /Alert %}"></textarea>
    </div>
    <div class="panel-resizer" id="panel-resizer" role="separator" aria-orientation="vertical" aria-label="Resize input and preview panels; use arrow keys" aria-valuemin="240" aria-valuemax="1200" aria-valuenow="50" tabindex="0"></div>
    <div class="panel" id="preview-panel">
      <div class="panel-header">Preview</div>
      <div class="preview" id="preview">
        <div class="empty-state">Start typing mdocUI markup<br/>to see the live preview</div>
      </div>
      <div class="errors" id="errors" style="display:none"></div>
    </div>
  </div>
  <section class="replay" aria-label="Streaming replay controls">
    <div class="replay-actions">
      <button class="replay-primary" id="replay-play" type="button" aria-label="Play stream" aria-pressed="false"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path id="play-path" d="M8 5v14l11-7z"/></svg><span id="replay-play-label">Play stream</span></button>
      <button class="replay-action" id="replay-step" type="button" aria-label="Advance one chunk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 5v14l10-7zM19 5v14"/></svg>Step</button>
      <button class="replay-action" id="replay-reset" type="button" aria-label="Restart replay"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12a9 9 0 1 0 2.64-6.36L3 8"/><path d="M3 3v5h5"/></svg>Restart</button>
    </div>
    <label for="replay-sample">Sample <select id="replay-sample"><option value="">Load sample…</option><option value="boundaries">Split delimiters</option><option value="open-body">Open body</option></select></label>
    <label for="chunk-size">Chunk size <select id="chunk-size"><option>1</option><option>2</option><option selected>4</option><option>8</option><option>16</option></select></label>
    <input id="replay-seek" type="range" min="0" max="0" value="0" aria-label="Seek replay progress" />
    <span id="replay-progress" aria-live="off">0 / 0 chunks</span>
  </section>
  <div class="inspector-resizer" id="inspector-resizer" role="separator" aria-orientation="horizontal" aria-label="Resize inspection panels; use arrow keys" aria-valuemin="100" aria-valuemax="600" aria-valuenow="210" tabindex="0"></div>
  <div class="inspectors" id="inspectors">
    <section><h2>AST</h2><pre id="ast-inspector" tabindex="0" aria-label="AST JSON">Run replay to inspect parser output.</pre></section>
    <section><h2>Parser state</h2><pre id="meta-inspector" tabindex="0" aria-label="Parser metadata JSON">Run replay to inspect parser metadata.</pre></section>
  </div>
  <div class="status-bar">
    <span id="status" role="status" aria-live="polite" aria-atomic="true">Ready</span>
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
  const playButton = document.getElementById('replay-play');
  const stepButton = document.getElementById('replay-step');
  const resetButton = document.getElementById('replay-reset');
  const chunkSizeEl = document.getElementById('chunk-size');
  const sampleEl = document.getElementById('replay-sample');
  const seekEl = document.getElementById('replay-seek');
  const progressEl = document.getElementById('replay-progress');
  const playPath = document.getElementById('play-path');
  const playLabel = document.getElementById('replay-play-label');
  const astInspector = document.getElementById('ast-inspector');
  const metaInspector = document.getElementById('meta-inspector');
  const inspectors = document.getElementById('inspectors');
  const inspectorResizer = document.getElementById('inspector-resizer');
  const panels = document.querySelector('.panels');
  const inputPanel = document.getElementById('input-panel');
  const previewPanel = document.getElementById('preview-panel');
  const panelResizer = document.getElementById('panel-resizer');

  if (${knownTags !== undefined}) {
    tagCountEl.textContent = knownTags.length + ' registered component' + (knownTags.length === 1 ? '' : 's');
  } else {
    tagCountEl.textContent = 'No component config · all tags accepted';
  }

  let timer = null;
  let replayTimer = null;
  let followFrame = null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let replayThrough = 0;
  let replayTotal = 0;
  let requestVersion = 0;
  let playbackVersion = 0;

  function updateProgress(through, total) {
    replayThrough = through;
    replayTotal = total;
    seekEl.max = String(total);
    seekEl.value = String(through);
    updateSeekFill();
    progressEl.textContent = through + ' / ' + total + ' chunks';
  }

  function updateSeekFill() {
    const percent = replayTotal ? replayThrough / replayTotal * 100 : 0;
    seekEl.style.setProperty('--seek-progress', percent + '%');
  }

  function setPlaying(playing) {
    playPath.setAttribute('d', playing ? 'M7 5h4v14H7zm6 0h4v14h-4z' : 'M8 5v14l11-7z');
    playLabel.textContent = playing ? 'Pause stream' : 'Play stream';
    playButton.setAttribute('aria-label', playing ? 'Pause stream' : 'Play stream');
    playButton.setAttribute('aria-pressed', String(playing));
    playButton.title = playing ? 'Pause stream' : 'Play stream';
  }

  function resizeInspectors(height) {
    const min = 100;
    const max = Math.max(min, Math.min(window.innerHeight * 0.65, 620));
    const next = Math.max(min, Math.min(max, height));
    inspectors.style.height = next + 'px';
    inspectorResizer.setAttribute('aria-valuemax', String(Math.round(max)));
    inspectorResizer.setAttribute('aria-valuenow', String(Math.round(next)));
  }
  resizeInspectors(inspectors.getBoundingClientRect().height);

  function resizePanels(width) {
    if (window.innerWidth <= 760) {
      inputPanel.style.flex = '';
      previewPanel.style.flex = '';
      return;
    }
    const min = 240;
    const available = panels.clientWidth - panelResizer.offsetWidth;
    const max = Math.max(min, available - min);
    const next = Math.max(min, Math.min(max, width));
    inputPanel.style.flex = '0 0 ' + next + 'px';
    previewPanel.style.flex = '1 1 0';
    panelResizer.setAttribute('aria-valuemax', String(Math.round(max)));
    panelResizer.setAttribute('aria-valuenow', String(Math.round(next)));
  }
  resizePanels(inputPanel.getBoundingClientRect().width);
  window.addEventListener('resize', function() {
    resizePanels(inputPanel.getBoundingClientRect().width);
  });

  let panelResizeStart = null;
  panelResizer.addEventListener('pointerdown', function(event) {
    if (event.button !== 0) return;
    panelResizeStart = { x: event.clientX, width: inputPanel.getBoundingClientRect().width };
    panelResizer.setPointerCapture(event.pointerId);
  });
  panelResizer.addEventListener('pointermove', function(event) {
    if (panelResizeStart) resizePanels(panelResizeStart.width + event.clientX - panelResizeStart.x);
  });
  panelResizer.addEventListener('pointerup', function() { panelResizeStart = null; });
  panelResizer.addEventListener('pointercancel', function() { panelResizeStart = null; });
  panelResizer.addEventListener('keydown', function(event) {
    const current = inputPanel.getBoundingClientRect().width;
    if (event.key === 'ArrowLeft') { event.preventDefault(); resizePanels(current - 24); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); resizePanels(current + 24); }
    else if (event.key === 'Home') { event.preventDefault(); resizePanels(240); }
    else if (event.key === 'End') { event.preventDefault(); resizePanels(panels.clientWidth - panelResizer.offsetWidth - 240); }
  });

  let resizeStart = null;
  inspectorResizer.addEventListener('pointerdown', function(event) {
    if (event.button !== 0) return;
    resizeStart = { y: event.clientY, height: inspectors.getBoundingClientRect().height };
    inspectorResizer.setPointerCapture(event.pointerId);
  });
  inspectorResizer.addEventListener('pointermove', function(event) {
    if (resizeStart) resizeInspectors(resizeStart.height + resizeStart.y - event.clientY);
  });
  inspectorResizer.addEventListener('pointerup', function() { resizeStart = null; });
  inspectorResizer.addEventListener('pointercancel', function() { resizeStart = null; });
  inspectorResizer.addEventListener('keydown', function(event) {
    const current = inspectors.getBoundingClientRect().height;
    if (event.key === 'ArrowUp') { event.preventDefault(); resizeInspectors(current + 24); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); resizeInspectors(current - 24); }
    else if (event.key === 'Home') { event.preventDefault(); resizeInspectors(100); }
    else if (event.key === 'End') { event.preventDefault(); resizeInspectors(Math.min(window.innerHeight * 0.65, 620)); }
  });

  function stopReplay() {
    clearTimeout(replayTimer);
    cancelAnimationFrame(followFrame);
    replayTimer = null;
    followFrame = null;
    requestVersion++;
    playbackVersion++;
    stepButton.disabled = false;
    playButton.disabled = false;
    setPlaying(false);
  }

  function followPreview() {
    followFrame = null;
    if (!replayTimer) return;
    const panes = [preview, astInspector, metaInspector];
    let needsFollow = false;
    panes.forEach(function(pane) {
      const distance = pane.scrollHeight - pane.clientHeight - pane.scrollTop;
      if (reduceMotion) pane.scrollTop = pane.scrollHeight;
      else if (distance > 1) {
        pane.scrollTop += distance * 0.2;
        needsFollow = true;
      }
    });
    if (needsFollow) followFrame = requestAnimationFrame(followPreview);
  }

  async function replayAt(through) {
    clearTimeout(timer);
    const version = ++requestVersion;
    const chunkSize = Number(chunkSizeEl.value);
    const content = editor.value;
    const total = Math.ceil(content.length / chunkSize);
    const target = Math.max(0, Math.min(total, through));
    stepButton.disabled = true;
    playButton.disabled = !replayTimer;
    status.textContent = 'Replaying...';
    try {
      const res = await fetch('/api/replay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, chunkSize, through: target }),
      });
      const data = await res.json();
      if (version !== requestVersion) return false;
      if (!res.ok || data.error) throw new Error(data.error || 'Replay request failed');
      updateProgress(target, total);
      preview.innerHTML = renderNodes(data.nodes, data.meta);
      if (replayTimer && !followFrame) followFrame = requestAnimationFrame(followPreview);
      nodeCount.textContent = data.meta.nodeCount + ' node' + (data.meta.nodeCount === 1 ? '' : 's');
      astInspector.textContent = JSON.stringify(data.nodes, null, 2);
      metaInspector.textContent = JSON.stringify(data.meta, null, 2);
      if (data.meta.errors && data.meta.errors.length) {
        errors.style.display = 'block';
        errors.innerHTML = data.meta.errors.map(function(e) { return '<div class="error-item">' + escapeHtml(e.message) + '</div>'; }).join('');
      } else errors.style.display = 'none';
      status.textContent = data.final ? 'Replay complete' : replayTimer ? 'Streaming' : 'Paused at chunk ' + target + ' of ' + total + ' · stream not finished';
      return true;
    } catch (err) {
      if (version !== requestVersion) return false;
      status.textContent = 'Replay error: ' + err.message;
      stopReplay();
      return false;
    } finally {
      if (version === requestVersion) {
        stepButton.disabled = false;
        playButton.disabled = false;
      }
    }
  }

  function startReplay() {
    if (replayTimer) return;
    stopReplay();
    clearTimeout(timer);
    const version = ++playbackVersion;
    let firstTick = true;
    setPlaying(true);
    async function tick() {
      if (version !== playbackVersion) return;
      const target = firstTick && replayThrough >= replayTotal ? 0 : replayThrough + 1;
      firstTick = false;
      const applied = await replayAt(target);
      if (version !== playbackVersion) return;
      if (!applied || replayThrough >= replayTotal) { stopReplay(); return; }
      replayTimer = setTimeout(tick, 60);
    }
    replayTimer = setTimeout(tick, 0);
  }

  playButton.addEventListener('click', function() {
    if (playButton.disabled) return;
    if (replayTimer) {
      stopReplay();
      status.textContent = 'Paused at chunk ' + replayThrough + ' of ' + replayTotal;
    } else startReplay();
  });
  stepButton.addEventListener('click', function() { stopReplay(); replayAt(replayThrough + 1); });
  resetButton.addEventListener('click', function() { stopReplay(); replayAt(0); });
  seekEl.addEventListener('input', function() { stopReplay(); });
  seekEl.addEventListener('change', function() { stopReplay(); replayAt(Number(seekEl.value)); });
  chunkSizeEl.addEventListener('change', function() { stopReplay(); replayAt(0); });
  sampleEl.addEventListener('change', function() {
    const samples = {
      boundaries: '{% callout type="info" %}\\nStep through both delimiters one character at a time.\\n{% /callout %}\\n{% button action="continue" label="Continue" /%}',
      'open-body': '{% callout type="info" %}\\nThis body is still open. The final flush reports an unclosed tag.',
    };
    if (!samples[sampleEl.value]) return;
    stopReplay();
    editor.value = samples[sampleEl.value];
    chunkSizeEl.value = '1';
    replayAt(0);
  });

  editor.addEventListener('input', function() {
    stopReplay();
    clearTimeout(timer);
    updateProgress(0, Math.ceil(editor.value.length / Number(chunkSizeEl.value)));
    astInspector.textContent = '';
    metaInspector.textContent = '';
    timer = setTimeout(parse, 150);
  });

  async function parse() {
    const version = ++requestVersion;
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
      if (version !== requestVersion) return;

      if (!res.ok || data.error) {
        status.textContent = 'Error: ' + data.error;
        return;
      }

      preview.innerHTML = renderNodes(data.nodes);
      astInspector.textContent = JSON.stringify(data.nodes, null, 2);
      metaInspector.textContent = JSON.stringify(data.meta, null, 2);
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
      if (version !== requestVersion) return;
      status.textContent = 'Fetch error: ' + err.message;
    }
  }

  function renderNodes(nodes, meta) {
    if (!nodes || nodes.length === 0) return '<div class="empty-state">Waiting for streamed output…</div>';
    // Snapshot open frames form the last-child branch, not every node with that name.
    return nodes.map(function(node, index) { return renderNode(node, index === nodes.length - 1 ? meta : undefined); }).join('');
  }

  function renderNode(node, meta) {
    if (node.type === 'prose') {
      if (!node.content.trim()) return '';
      return '<div class="node-prose">' + markdownToHtml(node.content) + '</div>';
    }

    if (node.type === 'component') {
      var html = '<div class="node-component">';
      html += '<div class="node-component-header">';
      html += '<span class="node-component-name">' + escapeHtml(node.name) + '</span>';
      var isOpen = meta && meta.openTags && meta.openTags[0] === node.name;
      if (node.selfClosing) {
        html += '<span class="node-component-badge">self-closing</span>';
      } else if (isOpen) {
        html += '<span class="node-component-badge">in progress</span>';
      }
      html += '</div>';

      var propKeys = Object.keys(node.props || {});
      if (propKeys.length > 0) {
        html += '<div class="node-component-props">';
        propKeys.forEach(function(key) {
          var val = node.props[key];
          var display = typeof val === 'string' ? '"' + escapeHtml(val) + '"' : escapeHtml(String(val));
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
        html += renderNodes(node.children, isOpen ? { openTags: meta.openTags.slice(1) } : undefined);
        html += '</div>';
      } else if (isOpen) {
        html += '<div class="streaming-placeholder">Waiting for streamed content…</div>';
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
