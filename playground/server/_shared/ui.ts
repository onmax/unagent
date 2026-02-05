export function renderIndexHtml(): string {
  // Keep this as a single HTML payload (no assets binding required for Workers).
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unagent Playground (Nitro)</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
  <style>
    :root { --pico-font-size: 14px; }
    body { padding: 1rem; }
    .buttons { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
    .buttons button { margin: 0; }
    #logs { height: 50vh; overflow-y: auto; background: var(--pico-code-background-color); padding: 1rem; border-radius: var(--pico-border-radius); font-family: monospace; font-size: 12px; white-space: pre-wrap; word-break: break-word; }
    .log-entry { margin-bottom: 0.5rem; border-bottom: 1px solid var(--pico-muted-border-color); padding-bottom: 0.5rem; }
    .log-entry .time { color: var(--pico-muted-color); }
    .log-entry .endpoint { color: var(--pico-primary); font-weight: bold; }
    .log-entry .error { color: var(--pico-del-color); }
    .log-entry .success { color: var(--pico-ins-color); }
    textarea { font-family: monospace; font-size: 12px; }
    .provider { font-size: 0.75rem; color: var(--pico-muted-color); }
  </style>
</head>
<body>
  <h1>Unagent Playground <span id="provider" class="provider"></span></h1>

    <section>
      <h2>Sandbox</h2>
      <div class="buttons">
        <button onclick="call('/api/health')">health</button>
        <button onclick="call('/api/oidc')">oidc</button>
        <button onclick="call('/api/sandbox')">sandbox</button>
        <button onclick="call('/api/sandbox/supports')">supports</button>
        <button onclick="call('/api/sandbox/mkdir')">mkdir</button>
        <button onclick="call('/api/sandbox/files')">files</button>
        <button onclick="call('/api/sandbox/stream')">stream</button>
      <button onclick="call('/api/sandbox/process')">process</button>
      <button onclick="call('/api/sandbox/git')">git</button>
      <button onclick="call('/api/sandbox/session')">session</button>
      <button onclick="call('/api/sandbox/code')">code</button>
      <button onclick="call('/api/sandbox/ports')">ports</button>
      <button onclick="clearLogs()" class="secondary">clear</button>
    </div>
  </section>

  <section>
    <h2>Workflow</h2>
    <label for="workflow-payload">Payload (JSON)</label>
    <textarea id="workflow-payload" rows="5">{
  "userId": "demo"
}</textarea>

    <label for="workflow-run-id">Run ID</label>
    <input id="workflow-run-id" type="text" placeholder="runId..." />

    <div class="buttons">
      <button onclick="workflowStart()">start</button>
      <button onclick="workflowStatus()">status</button>
      <button onclick="workflowStop()">stop</button>
      <button onclick="call('/api/workflow/supports')">supports</button>
    </div>
  </section>

  <section>
    <h2>Queue</h2>
    <label for="queue-payload">Payload (JSON)</label>
    <textarea id="queue-payload" rows="4">{
  "hello": "world"
}</textarea>

    <div class="buttons">
      <button onclick="call('/api/queue/supports')">supports</button>
      <button onclick="queueSend()">send</button>
      <button onclick="queueSendBatch()">sendBatch</button>
    </div>
  </section>

  <section>
    <h2>Vector</h2>
    <label for="vector-query">Query</label>
    <input id="vector-query" type="text" value="hello world" />

    <label for="vector-docs">Docs (JSON)</label>
    <textarea id="vector-docs" rows="6">[
  { "id": "doc-1", "content": "Hello world from Unagent vector demo.", "metadata": { "tag": "demo" } },
  { "id": "doc-2", "content": "Vector search lets you find similar text quickly.", "metadata": { "tag": "demo" } },
  { "id": "doc-3", "content": "Cloudflare Vectorize works great with Workers.", "metadata": { "tag": "cloudflare" } }
]</textarea>

    <label for="vector-options">Search Options (JSON)</label>
    <textarea id="vector-options" rows="4">{
  "limit": 5,
  "returnContent": true,
  "returnMetadata": true
}</textarea>

    <label for="vector-ids">IDs (comma-separated)</label>
    <input id="vector-ids" type="text" value="doc-1,doc-2" />

    <div class="buttons">
      <button onclick="vectorIndex()">index</button>
      <button onclick="vectorSearch()">search</button>
      <button onclick="vectorRemove()">remove</button>
      <button onclick="vectorClear()">clear</button>
      <button onclick="call('/api/vector/supports')">supports</button>
    </div>
  </section>

  <div id="logs"></div>
  <script>
    const providerEl = document.getElementById('provider');
    const logs = document.getElementById('logs');
    const runIdInput = document.getElementById('workflow-run-id');
    const payloadInput = document.getElementById('workflow-payload');
    const queuePayloadInput = document.getElementById('queue-payload');
    const vectorQueryInput = document.getElementById('vector-query');
    const vectorDocsInput = document.getElementById('vector-docs');
    const vectorOptionsInput = document.getElementById('vector-options');
    const vectorIdsInput = document.getElementById('vector-ids');

    (async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        if (data && data.provider) providerEl.textContent = '(' + data.provider + ')';
      } catch {}
    })();

    async function call(endpoint, options = {}) {
      const time = new Date().toLocaleTimeString();
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML = \`<span class="time">[\${time}]</span> <span class="endpoint">\${endpoint}</span> loading...\`;
      logs.prepend(entry);
      try {
        const start = Date.now();
        const res = await fetch(endpoint, options);
        const data = await res.json();
        const elapsed = Date.now() - start;
        const status = data && data.error ? 'error' : 'success';
        entry.innerHTML = \`<span class="time">[\${time}]</span> <span class="endpoint">\${endpoint}</span> <span class="\${status}">\${elapsed}ms</span>\\n\${JSON.stringify(data, null, 2)}\`;
        return data;
      } catch (e) {
        entry.innerHTML = \`<span class="time">[\${time}]</span> <span class="endpoint">\${endpoint}</span> <span class="error">ERROR: \${e.message}</span>\`;
        return null;
      }
    }
    function clearLogs() { logs.innerHTML = ''; }

    async function postJson(endpoint, body) {
      return call(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
    }

    async function queueSend() {
      let payload = {};
      try {
        payload = queuePayloadInput.value ? JSON.parse(queuePayloadInput.value) : {};
      } catch (error) {
        await postJson('/api/queue/send', { error: 'Invalid payload JSON: ' + error.message });
        return;
      }
      await postJson('/api/queue/send', { payload, options: { contentType: 'json' } });
    }

    async function queueSendBatch() {
      let payload = {};
      try {
        payload = queuePayloadInput.value ? JSON.parse(queuePayloadInput.value) : {};
      } catch (error) {
        await postJson('/api/queue/sendBatch', { error: 'Invalid payload JSON: ' + error.message });
        return;
      }
      await postJson('/api/queue/sendBatch', { messages: [{ body: payload, contentType: 'json' }], options: { delaySeconds: 1 } });
    }

    async function workflowStart() {
      let payload = {};
      try {
        payload = payloadInput.value ? JSON.parse(payloadInput.value) : {};
      } catch (error) {
        await call('/api/workflow/start', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ error: \`Invalid JSON payload: \${error.message}\` })
        });
        return;
      }
      const data = await call('/api/workflow/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payload })
      });
      if (data && data.runId) runIdInput.value = data.runId;
    }

    async function workflowStatus() {
      const runId = runIdInput.value.trim();
      if (!runId) {
        await call('/api/workflow/status', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ error: 'Missing runId' })
        });
        return;
      }
      await call(\`/api/workflow/status?runId=\${encodeURIComponent(runId)}\`);
    }

    async function workflowStop() {
      const runId = runIdInput.value.trim();
      if (!runId) {
        await call('/api/workflow/stop', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ error: 'Missing runId' })
        });
        return;
      }
      await call('/api/workflow/stop', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ runId })
      });
    }

    async function vectorIndex() {
      let docs = [];
      try {
        docs = vectorDocsInput.value ? JSON.parse(vectorDocsInput.value) : [];
      } catch (error) {
        await postJson('/api/vector/index', { error: 'Invalid docs JSON: ' + error.message });
        return;
      }
      await postJson('/api/vector/index', { docs });
    }

    async function vectorSearch() {
      let options = {};
      try {
        options = vectorOptionsInput.value ? JSON.parse(vectorOptionsInput.value) : {};
      } catch (error) {
        await postJson('/api/vector/search', { error: 'Invalid options JSON: ' + error.message });
        return;
      }
      const query = vectorQueryInput.value || '';
      await postJson('/api/vector/search', { query, options });
    }

    async function vectorRemove() {
      const ids = vectorIdsInput.value
        ? vectorIdsInput.value.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      await postJson('/api/vector/remove', { ids });
    }

    async function vectorClear() {
      await postJson('/api/vector/clear', {});
    }
  </script>
</body>
</html>`
}
