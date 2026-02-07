export function renderIndexHtml(): string {
  // Keep this as a single HTML payload (no assets binding required for Workers).
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unagent Playground</title>
  <style>
    :root {
      --bg0: #0b1220;
      --bg1: #0f1c33;
      --card: rgba(255,255,255,0.06);
      --card2: rgba(255,255,255,0.08);
      --text: rgba(255,255,255,0.92);
      --muted: rgba(255,255,255,0.66);
      --line: rgba(255,255,255,0.12);
      --accent: #4cf0c0;
      --danger: #ff4d6d;
      --warn: #ffd166;
      --radius: 14px;
      --shadow: 0 16px 40px rgba(0,0,0,0.35);
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      --sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
      --serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
    }

    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      margin: 0;
      color: var(--text);
      font-family: var(--sans);
      background:
        radial-gradient(1200px 800px at 20% -20%, rgba(76,240,192,0.22), transparent 60%),
        radial-gradient(900px 600px at 110% 10%, rgba(255,77,109,0.16), transparent 55%),
        linear-gradient(180deg, var(--bg0), var(--bg1));
    }

    .top {
      position: sticky;
      top: 0;
      z-index: 10;
      border-bottom: 1px solid var(--line);
      background: rgba(11,18,32,0.72);
      backdrop-filter: blur(10px);
    }
    .top-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .brand { display: flex; align-items: baseline; gap: 10px; min-width: 0; flex-wrap: wrap; }
    .brand h1 {
      margin: 0;
      font-family: var(--serif);
      font-weight: 700;
      font-size: 18px;
      letter-spacing: 0.3px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(255,255,255,0.05);
      color: var(--muted);
      font-size: 12px;
      white-space: nowrap;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--warn); box-shadow: 0 0 0 2px rgba(255,209,102,0.18); }
    .dot.ok { background: var(--accent); box-shadow: 0 0 0 2px rgba(76,240,192,0.20); }
    .dot.err { background: var(--danger); box-shadow: 0 0 0 2px rgba(255,77,109,0.18); }

    .layout {
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px;
      display: grid;
      grid-template-columns: 250px 1fr;
      gap: 16px;
      align-items: start;
    }

    .nav {
      position: sticky;
      top: 70px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.04);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .nav-head {
      padding: 12px 12px 10px;
      border-bottom: 1px solid var(--line);
      background: rgba(255,255,255,0.03);
    }
    .nav-title { margin: 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
    .nav-items { padding: 10px; display: grid; gap: 8px; }
    .tab {
      width: 100%;
      text-align: left;
      padding: 10px 10px;
      border-radius: 12px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text);
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      font-size: 13px;
    }
    .tab:hover { background: rgba(255,255,255,0.04); }
    .tab[aria-selected="true"] { border-color: rgba(76,240,192,0.35); background: rgba(76,240,192,0.08); }
    .tab small { color: var(--muted); font-family: var(--mono); }

    .panel {
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.04);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .panel-head {
      padding: 14px 14px 12px;
      border-bottom: 1px solid var(--line);
      background: rgba(255,255,255,0.03);
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .panel-head h2 { margin: 0; font-family: var(--serif); font-size: 16px; }
    .panel-head p { margin: 0; color: var(--muted); font-size: 12px; }
    .panel-body { padding: 14px; display: grid; gap: 14px; }

    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

    .field { display: grid; gap: 6px; }
    .field label { font-size: 12px; color: var(--muted); letter-spacing: 0.02em; }
    .field input, .field textarea, .field select {
      width: 100%;
      padding: 10px 10px;
      border-radius: 12px;
      border: 1px solid var(--line);
      background: rgba(0,0,0,0.22);
      color: var(--text);
      outline: none;
      font-family: var(--mono);
      font-size: 12px;
    }
    .field textarea { min-height: 110px; resize: vertical; }
    .hint { color: var(--muted); font-size: 12px; line-height: 1.35; }

    .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .btn {
      padding: 9px 12px;
      border-radius: 12px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.04);
      color: var(--text);
      cursor: pointer;
      font-size: 12px;
      font-family: var(--sans);
    }
    .btn:hover { background: rgba(255,255,255,0.06); }
    .btn.primary { border-color: rgba(76,240,192,0.35); background: rgba(76,240,192,0.10); }
    .btn.danger { border-color: rgba(255,77,109,0.35); background: rgba(255,77,109,0.10); }
    .btn.mono { font-family: var(--mono); }

    details {
      border: 1px dashed rgba(255,255,255,0.18);
      border-radius: 12px;
      padding: 10px 10px;
      background: rgba(255,255,255,0.02);
    }
    summary { cursor: pointer; color: var(--muted); font-size: 12px; }

    .logs {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 16px 20px;
    }
    .logs-card {
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.04);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .logs-head {
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
      background: rgba(255,255,255,0.03);
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
    }
    .logs-head h3 { margin: 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
    .logs-tools { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .logs-tools input {
      padding: 9px 10px;
      border-radius: 12px;
      border: 1px solid var(--line);
      background: rgba(0,0,0,0.22);
      color: var(--text);
      outline: none;
      font-family: var(--sans);
      font-size: 12px;
      min-width: 220px;
    }
    .log-list { max-height: 52vh; overflow: auto; }
    .log {
      border-top: 1px solid rgba(255,255,255,0.08);
      padding: 12px 14px;
      font-family: var(--mono);
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .log:first-child { border-top: 0; }
    .log .meta { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; color: var(--muted); margin-bottom: 8px; font-family: var(--sans); }
    .pill { display: inline-flex; align-items: center; gap: 8px; padding: 4px 8px; border-radius: 999px; border: 1px solid var(--line); background: rgba(255,255,255,0.04); }
    .pill.ok { border-color: rgba(76,240,192,0.30); }
    .pill.err { border-color: rgba(255,77,109,0.30); }
    .pill.warn { border-color: rgba(255,209,102,0.30); }
    .log .data { color: rgba(255,255,255,0.90); }

    @media (max-width: 980px) {
      .layout { grid-template-columns: 1fr; }
      .nav { position: relative; top: 0; }
      .grid2, .grid3 { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header class="top">
    <div class="top-inner">
      <div class="brand">
        <h1>Unagent Playground</h1>
        <span class="badge"><span class="dot" id="runtimeDot"></span><span id="runtimeText">runtime: loading</span></span>
        <span class="badge"><span class="dot" id="queueDot"></span><span id="queueText">queue: loading</span></span>
      </div>
      <div class="row">
        <button class="btn mono" onclick="api('/api/health')">/api/health</button>
        <button class="btn mono" onclick="api('/api/oidc')">/api/oidc</button>
        <button class="btn danger" onclick="clearLogs()">clear logs</button>
      </div>
    </div>
  </header>

  <div class="layout">
    <aside class="nav">
      <div class="nav-head">
        <p class="nav-title">Modules</p>
      </div>
      <div class="nav-items">
        <button class="tab" data-tab="sandbox" aria-selected="true">Sandbox <small>/api/sandbox</small></button>
        <button class="tab" data-tab="workflow" aria-selected="false">Workflow <small>/api/workflow</small></button>
        <button class="tab" data-tab="queue" aria-selected="false">Queue <small>/api/queue</small></button>
        <button class="tab" data-tab="vector" aria-selected="false">Vector <small>/api/vector</small></button>
        <button class="tab" data-tab="qstash" aria-selected="false">QStash <small>/api/qstash</small></button>
      </div>
    </aside>

    <main class="panel">
      <div class="panel-head">
        <div>
          <h2 id="panelTitle">Sandbox</h2>
          <p id="panelSubtitle">Quick calls for sandbox capabilities and actions.</p>
        </div>
        <div class="row">
          <button class="btn" onclick="copyLast()">copy last</button>
          <button class="btn" onclick="formatEditors()">format JSON</button>
        </div>
      </div>

      <div class="panel-body">
        <section data-panel="sandbox">
          <div class="row">
            <button class="btn primary" onclick="api('/api/sandbox')">sandbox</button>
            <button class="btn" onclick="api('/api/sandbox/supports')">supports</button>
            <button class="btn" onclick="api('/api/sandbox/session')">session</button>
          </div>
          <div class="row">
            <button class="btn" onclick="api('/api/sandbox/mkdir')">mkdir</button>
            <button class="btn" onclick="api('/api/sandbox/files')">files</button>
            <button class="btn" onclick="api('/api/sandbox/stream')">stream</button>
            <button class="btn" onclick="api('/api/sandbox/process')">process</button>
            <button class="btn" onclick="api('/api/sandbox/git')">git</button>
            <button class="btn" onclick="api('/api/sandbox/code')">code</button>
            <button class="btn" onclick="api('/api/sandbox/ports')">ports</button>
          </div>
          <p class="hint">Same endpoints behave differently depending on runtime (Cloudflare, Vercel, local).</p>
        </section>

        <section data-panel="workflow" hidden>
          <div class="grid2">
            <div class="field">
              <label for="wfPayload">Payload (JSON)</label>
              <textarea id="wfPayload">{
  "userId": "demo"
}</textarea>
            </div>
            <div class="field">
              <label for="wfRunId">Run ID</label>
              <input id="wfRunId" placeholder="runId..." />
              <div class="row">
                <button class="btn primary" onclick="workflowStart()">start</button>
                <button class="btn" onclick="workflowStatus()">status</button>
                <button class="btn danger" onclick="workflowStop()">stop</button>
              </div>
              <div class="row">
                <button class="btn" onclick="api('/api/workflow/supports')">supports</button>
              </div>
              <p class="hint">Vercel uses an in-memory demo workflow. Cloudflare uses the workflow binding.</p>
            </div>
          </div>
        </section>

        <section data-panel="queue" hidden>
          <div class="grid2">
            <div class="field">
              <label for="queuePayload">Payload (JSON)</label>
              <textarea id="queuePayload">{
  "hello": "world"
}</textarea>
              <details>
                <summary>Options</summary>
                <div class="grid3" style="margin-top: 10px;">
                  <div class="field">
                    <label for="queueDelay">delaySeconds</label>
                    <input id="queueDelay" placeholder="e.g. 10" />
                  </div>
                  <div class="field">
                    <label for="queueDedup">idempotencyKey</label>
                    <input id="queueDedup" placeholder="optional" />
                  </div>
                  <div class="field">
                    <label for="queueContentType">contentType</label>
                    <select id="queueContentType">
                      <option value="json">json</option>
                      <option value="text">text</option>
                      <option value="bytes">bytes</option>
                      <option value="v8">v8</option>
                    </select>
                  </div>
                </div>
              </details>
              <div class="row">
                <button class="btn" onclick="api('/api/queue/supports')">supports</button>
                <button class="btn primary" onclick="queueSend()">send</button>
                <button class="btn" onclick="queueSendBatch()">sendBatch</button>
              </div>
            </div>

            <div class="field">
              <label>Memory-only tools (local runtime)</label>
              <div class="row">
                <button class="btn" onclick="api('/api/queue/peek?limit=20')">peek</button>
                <button class="btn danger" onclick="queueDrain()">drain</button>
              </div>
              <p class="hint">When running locally, the playground uses the in-memory queue provider.</p>
            </div>
          </div>
        </section>

        <section data-panel="vector" hidden>
          <div class="grid2">
            <div class="field">
              <label for="vectorQuery">Query</label>
              <input id="vectorQuery" value="hello world" />
              <label for="vectorDocs" style="margin-top: 10px;">Docs (JSON)</label>
              <textarea id="vectorDocs">[
  { "id": "doc-1", "content": "Hello world from Unagent vector demo.", "metadata": { "tag": "demo" } },
  { "id": "doc-2", "content": "Vector search lets you find similar text quickly.", "metadata": { "tag": "demo" } },
  { "id": "doc-3", "content": "Cloudflare Vectorize works great with Workers.", "metadata": { "tag": "cloudflare" } }
]</textarea>
            </div>
            <div class="field">
              <label for="vectorOptions">Search Options (JSON)</label>
              <textarea id="vectorOptions">{
  "limit": 5,
  "returnContent": true,
  "returnMetadata": true
}</textarea>
              <label for="vectorIds" style="margin-top: 10px;">IDs (comma-separated)</label>
              <input id="vectorIds" value="doc-1,doc-2" />
              <div class="row">
                <button class="btn primary" onclick="vectorIndex()">index</button>
                <button class="btn" onclick="vectorSearch()">search</button>
                <button class="btn" onclick="vectorRemove()">remove</button>
                <button class="btn danger" onclick="vectorClear()">clear</button>
                <button class="btn" onclick="api('/api/vector/supports')">supports</button>
              </div>
            </div>
          </div>
        </section>

        <section data-panel="qstash" hidden>
          <div class="grid2">
            <div class="field">
              <label for="qstashDestination">Destination URL</label>
              <input id="qstashDestination" placeholder="https://example.com/webhook" />
              <label for="qstashPayload" style="margin-top: 10px;">Payload (JSON)</label>
              <textarea id="qstashPayload">{
  "hello": "qstash"
}</textarea>
              <details>
                <summary>Options</summary>
                <div class="grid2" style="margin-top: 10px;">
                  <div class="field">
                    <label for="qstashDelay">delaySeconds</label>
                    <input id="qstashDelay" placeholder="e.g. 10" />
                  </div>
                  <div class="field">
                    <label for="qstashDedup">idempotencyKey</label>
                    <input id="qstashDedup" placeholder="optional" />
                  </div>
                </div>
              </details>
              <div class="row">
                <button class="btn" onclick="api('/api/qstash/supports')">supports</button>
                <button class="btn primary" onclick="qstashSend()">send</button>
                <button class="btn" onclick="qstashSendBatch()">sendBatch</button>
              </div>
              <p class="hint">Server-side only: set <span style="font-family: var(--mono);">QSTASH_TOKEN</span> and optionally <span style="font-family: var(--mono);">QSTASH_DESTINATION</span>.</p>
            </div>
            <div class="field">
              <label>Notes</label>
              <div class="hint">The browser never sees your token. The playground publishes from the server.</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>

  <section class="logs">
    <div class="logs-card">
      <div class="logs-head">
        <h3>Logs</h3>
        <div class="logs-tools">
          <input id="logFilter" placeholder="filter (endpoint, status, provider...)" />
          <button class="btn" onclick="toggleAutoScroll()" id="autoScrollBtn">autoscroll: on</button>
        </div>
      </div>
      <div class="log-list" id="logList"></div>
    </div>
  </section>

  <script>
    const logList = document.getElementById('logList');
    const logFilter = document.getElementById('logFilter');
    const runtimeText = document.getElementById('runtimeText');
    const runtimeDot = document.getElementById('runtimeDot');
    const queueText = document.getElementById('queueText');
    const queueDot = document.getElementById('queueDot');

    const panelTitle = document.getElementById('panelTitle');
    const panelSubtitle = document.getElementById('panelSubtitle');

    const wfPayload = document.getElementById('wfPayload');
    const wfRunId = document.getElementById('wfRunId');

    const queuePayload = document.getElementById('queuePayload');
    const queueDelay = document.getElementById('queueDelay');
    const queueDedup = document.getElementById('queueDedup');
    const queueContentType = document.getElementById('queueContentType');

    const vectorQuery = document.getElementById('vectorQuery');
    const vectorDocs = document.getElementById('vectorDocs');
    const vectorOptions = document.getElementById('vectorOptions');
    const vectorIds = document.getElementById('vectorIds');

    const qstashDestination = document.getElementById('qstashDestination');
    const qstashPayload = document.getElementById('qstashPayload');
    const qstashDelay = document.getElementById('qstashDelay');
    const qstashDedup = document.getElementById('qstashDedup');

    let autoScroll = true;
    let lastResponseText = '';

    const PANELS = {
      sandbox: { title: 'Sandbox', subtitle: 'Quick calls for sandbox capabilities and actions.' },
      workflow: { title: 'Workflow', subtitle: 'Start a workflow, check status, stop it.' },
      queue: { title: 'Queue', subtitle: 'Send and batch messages. Local runtime uses an in-memory queue.' },
      vector: { title: 'Vector', subtitle: 'Index/search/remove/clear documents.' },
      qstash: { title: 'QStash', subtitle: 'Publish messages to Upstash QStash from the server.' },
    };

    function setTab(name) {
      const tabs = document.querySelectorAll('.tab');
      tabs.forEach((t) => t.setAttribute('aria-selected', t.dataset.tab === name ? 'true' : 'false'));

      const panels = document.querySelectorAll('[data-panel]');
      panels.forEach((p) => { p.hidden = p.dataset.panel !== name; });

      const cfg = PANELS[name] || PANELS.sandbox;
      panelTitle.textContent = cfg.title;
      panelSubtitle.textContent = cfg.subtitle;

      try { localStorage.setItem('unagent.playground.tab', name); } catch {}
    }

    document.querySelectorAll('.tab').forEach((t) => {
      t.addEventListener('click', () => setTab(t.dataset.tab));
    });

    function safeParseJson(value) {
      if (!value) return {};
      return JSON.parse(value);
    }

    function formatJsonIn(el) {
      try {
        const parsed = safeParseJson(el.value);
        el.value = JSON.stringify(parsed, null, 2);
      } catch {}
    }

    function formatEditors() {
      [wfPayload, queuePayload, vectorDocs, vectorOptions, qstashPayload].forEach((el) => {
        if (el && el.value) formatJsonIn(el);
      });
    }

    async function copyLast() {
      if (!lastResponseText) return;
      try { await navigator.clipboard.writeText(lastResponseText); } catch {}
    }

    function clearLogs() {
      logList.innerHTML = '';
      lastResponseText = '';
    }

    function toggleAutoScroll() {
      autoScroll = !autoScroll;
      document.getElementById('autoScrollBtn').textContent = 'autoscroll: ' + (autoScroll ? 'on' : 'off');
    }

    function shouldShowLog(text) {
      const q = (logFilter.value || '').trim().toLowerCase();
      if (!q) return true;
      return text.toLowerCase().includes(q);
    }

    function escapeHtml(input) {
      return String(input)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function prettyJson(text) {
      try { return JSON.stringify(JSON.parse(text), null, 2); } catch { return text; }
    }

    function tryJson(text) {
      try { return JSON.parse(typeof text === 'string' ? text : String(text)); } catch { return text; }
    }

    function addLog(entry) {
      const time = new Date().toLocaleTimeString();
      const ok = entry.status === 'success';
      const ms = typeof entry.elapsed === 'number' ? (entry.elapsed + 'ms') : '';
      const headline = '[' + time + '] ' + entry.endpoint + (ms ? (' ' + ms) : '');

      const safeRes = entry.responseText || '';
      const allText = headline + '\\n' + safeRes;

      const node = document.createElement('div');
      node.className = 'log';
      if (!shouldShowLog(allText)) node.style.display = 'none';

      const pillClass = ok ? 'pill ok' : 'pill err';
      const dotClass = ok ? 'dot ok' : 'dot err';

      node.innerHTML =
        '<div class="meta">' +
        '<span class="' + pillClass + '"><span class="' + dotClass + '"></span>' + (ok ? 'ok' : 'error') + '</span>' +
        '<span class="pill"><strong style="font-family: var(--mono); font-weight: 700;">' + escapeHtml(entry.endpoint) + '</strong></span>' +
        (ms ? ('<span class="pill warn">' + escapeHtml(ms) + '</span>') : '') +
        '</div>' +
        '<div class="data">' + escapeHtml(prettyJson(safeRes || '(no response)')) + '</div>';

      logList.prepend(node);
      if (autoScroll) logList.scrollTop = 0;
    }

    logFilter.addEventListener('input', () => {
      const nodes = Array.from(logList.children);
      nodes.forEach((node) => {
        const text = node.textContent || '';
        node.style.display = shouldShowLog(text) ? '' : 'none';
      });
    });

    async function api(endpoint, init) {
      const start = Date.now();
      try {
        const res = await fetch(endpoint, init);
        const text = await res.text();
        lastResponseText = text;

        let status = res.ok ? 'success' : 'error';
        try {
          const json = JSON.parse(text);
          if (json && json.error) status = 'error';
        } catch {}

        addLog({ status, endpoint, elapsed: Date.now() - start, responseText: text });
        return tryJson(text);
      } catch (error) {
        addLog({ status: 'error', endpoint, elapsed: Date.now() - start, responseText: String(error && error.message ? error.message : error) });
        return null;
      }
    }

    async function postJson(endpoint, body) {
      return api(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    async function queueSend() {
      try {
        const payload = safeParseJson(queuePayload.value || '{}');
        const delaySeconds = queueDelay.value.trim() ? Number(queueDelay.value.trim()) : undefined;
        const idempotencyKey = queueDedup.value.trim() ? queueDedup.value.trim() : undefined;
        const contentType = queueContentType.value || 'json';
        const options = { contentType };
        if (delaySeconds !== undefined && !Number.isNaN(delaySeconds)) options.delaySeconds = delaySeconds;
        if (idempotencyKey) options.idempotencyKey = idempotencyKey;
        await postJson('/api/queue/send', { payload, options });
      } catch (error) {
        await postJson('/api/queue/send', { payload: { error: String(error && error.message ? error.message : error) } });
      }
    }

    async function queueSendBatch() {
      try {
        const payload = safeParseJson(queuePayload.value || '{}');
        const delaySeconds = queueDelay.value.trim() ? Number(queueDelay.value.trim()) : 1;
        const contentType = queueContentType.value || 'json';
        await postJson('/api/queue/sendBatch', { messages: [{ body: payload, contentType }], options: { delaySeconds } });
      } catch (error) {
        await postJson('/api/queue/sendBatch', { messages: [{ body: { error: String(error && error.message ? error.message : error) }, contentType: 'json' }], options: { delaySeconds: 1 } });
      }
    }

    async function queueDrain() {
      await postJson('/api/queue/drain', { limit: 50 });
    }

    async function workflowStart() {
      try {
        const payload = safeParseJson(wfPayload.value || '{}');
        const data = await postJson('/api/workflow/start', { payload });
        if (data && data.runId) wfRunId.value = data.runId;
      } catch (error) {
        await postJson('/api/workflow/start', { payload: { error: String(error && error.message ? error.message : error) } });
      }
    }

    async function workflowStatus() {
      const runId = wfRunId.value.trim();
      await api('/api/workflow/status?runId=' + encodeURIComponent(runId));
    }

    async function workflowStop() {
      const runId = wfRunId.value.trim();
      await postJson('/api/workflow/stop', { runId });
    }

    async function vectorIndex() {
      try {
        const docs = safeParseJson(vectorDocs.value || '[]');
        await postJson('/api/vector/index', { docs });
      } catch (error) {
        await postJson('/api/vector/index', { docs: [{ id: 'error', content: String(error && error.message ? error.message : error) }] });
      }
    }

    async function vectorSearch() {
      try {
        const options = safeParseJson(vectorOptions.value || '{}');
        const query = vectorQuery.value || '';
        await postJson('/api/vector/search', { query, options });
      } catch (error) {
        await postJson('/api/vector/search', { query: 'error', options: {}, error: String(error && error.message ? error.message : error) });
      }
    }

    async function vectorRemove() {
      const ids = vectorIds.value ? vectorIds.value.split(',').map(s => s.trim()).filter(Boolean) : [];
      await postJson('/api/vector/remove', { ids });
    }

    async function vectorClear() {
      await postJson('/api/vector/clear', {});
    }

    async function qstashSend() {
      try {
        const payload = safeParseJson(qstashPayload.value || '{}');
        const destination = qstashDestination.value.trim();
        const delaySeconds = qstashDelay.value.trim() ? Number(qstashDelay.value.trim()) : undefined;
        const idempotencyKey = qstashDedup.value.trim() ? qstashDedup.value.trim() : undefined;
        const options = {};
        if (delaySeconds !== undefined && !Number.isNaN(delaySeconds)) options.delaySeconds = delaySeconds;
        if (idempotencyKey) options.idempotencyKey = idempotencyKey;
        await postJson('/api/qstash/send', { destination, payload, options });
      } catch (error) {
        await postJson('/api/qstash/send', { destination: qstashDestination.value.trim(), payload: { error: String(error && error.message ? error.message : error) } });
      }
    }

    async function qstashSendBatch() {
      try {
        const payload = safeParseJson(qstashPayload.value || '{}');
        const destination = qstashDestination.value.trim();
        const delaySeconds = qstashDelay.value.trim() ? Number(qstashDelay.value.trim()) : 1;
        await postJson('/api/qstash/sendBatch', { destination, messages: [{ body: payload, contentType: 'json' }], options: { delaySeconds } });
      } catch (error) {
        await postJson('/api/qstash/sendBatch', { destination: qstashDestination.value.trim(), messages: [{ body: { error: String(error && error.message ? error.message : error) }, contentType: 'json' }], options: { delaySeconds: 1 } });
      }
    }

    (async () => {
      const saved = (() => { try { return localStorage.getItem('unagent.playground.tab'); } catch { return null; } })();
      if (saved) setTab(saved);

      const health = await api('/api/health');
      if (health && health.provider) {
        runtimeText.textContent = 'runtime: ' + String(health.provider);
        runtimeDot.className = 'dot ok';
      } else {
        runtimeText.textContent = 'runtime: unknown';
        runtimeDot.className = 'dot err';
      }

      const qs = await api('/api/queue/supports');
      if (qs && qs.supports) {
        const topic = qs.topic ? (' / ' + qs.topic) : '';
        const qp = qs.queueProvider ? (' (' + qs.queueProvider + ')') : '';
        queueText.textContent = 'queue: ' + String(qs.provider || 'unknown') + qp + topic;
        queueDot.className = 'dot ok';
      } else {
        queueText.textContent = 'queue: unknown';
        queueDot.className = 'dot err';
      }
    })();
  </script>
</body>
</html>`
}
