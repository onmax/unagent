import type { DurableObjectNamespaceLike } from 'unagent/sandbox'
import type { CloudflareQueueBindingLike } from 'unagent/queue'
import type { VectorDocument, VectorizeIndexBinding, VectorSearchOptions } from 'unagent/vector'
import type { CloudflareWorkflowBindingLike } from 'unagent/workflow'
import { getSandbox, Sandbox } from '@cloudflare/sandbox'
import { WorkflowEntrypoint } from 'cloudflare:workers'
import { createQueue } from 'unagent/queue'
import { createSandbox } from 'unagent/sandbox'
import { createCloudflareVectorAdapter } from 'unagent/vector/adapters/cloudflare'
import { createWorkflow } from 'unagent/workflow'

export { Sandbox }

interface Env {
  SANDBOX: DurableObjectNamespaceLike
  MY_WORKFLOW: CloudflareWorkflowBindingLike
  MY_QUEUE: CloudflareQueueBindingLike
  VECTORIZE: VectorizeIndexBinding
}

const VECTOR_DIMENSIONS = 32

const DEFAULT_VECTOR_DOCS: VectorDocument[] = [
  { id: 'doc-1', content: 'Hello world from Unagent vector demo.', metadata: { tag: 'demo', source: 'playground' } },
  { id: 'doc-2', content: 'Vector search lets you find similar text quickly.', metadata: { tag: 'demo', source: 'playground' } },
  { id: 'doc-3', content: 'Cloudflare Vectorize works great with Workers.', metadata: { tag: 'cloudflare', source: 'playground' } },
]

function hashToVector(text: string): number[] {
  const vec = new Float32Array(VECTOR_DIMENSIONS)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    const idx = i % VECTOR_DIMENSIONS
    vec[idx] += (code % 31) / 31
  }
  let norm = 0
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i]
  }
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < vec.length; i++) {
    vec[i] = vec[i] / norm
  }
  return Array.from(vec)
}

const embeddings = {
  async resolve() {
    return {
      embedder: async (texts: string[]) => texts.map(hashToVector),
      dimensions: VECTOR_DIMENSIONS,
    }
  },
}

let vectorClientPromise: ReturnType<typeof createCloudflareVectorAdapter> | null = null

function getVectorClient(env: Env): ReturnType<typeof createCloudflareVectorAdapter> {
  if (!vectorClientPromise) {
    vectorClientPromise = createCloudflareVectorAdapter(env.VECTORIZE, embeddings)
  }
  return vectorClientPromise
}

export class DemoWorkflow extends WorkflowEntrypoint {
  async run(
    event: { payload?: unknown },
    step: { do: (name: string, fn: () => Promise<unknown>) => Promise<unknown>, sleep: (name: string, duration: string) => Promise<void> },
  ): Promise<{ ok: boolean, payload: unknown }> {
    const payload = event?.payload ?? {}
    const result = await step.do('echo', async () => ({ payload }))
    await step.sleep('wait a bit', '30 seconds')
    return { ok: true, payload: (result as { payload?: unknown }).payload ?? result }
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    const path = url.pathname

    if (path === '/' || path === '') {
      return new Response(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unagent Playground (Cloudflare)</title>
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
  </style>
</head>
<body>
  <h1>Unagent Playground (Cloudflare)</h1>

  <section>
    <h2>Sandbox</h2>
    <div class="buttons">
      <button onclick="call('/api/health')">health</button>
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
  "hello": "cloudflare"
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
    const logs = document.getElementById('logs');
    const runIdInput = document.getElementById('workflow-run-id');
    const payloadInput = document.getElementById('workflow-payload');
    const queuePayloadInput = document.getElementById('queue-payload');
    const vectorQueryInput = document.getElementById('vector-query');
    const vectorDocsInput = document.getElementById('vector-docs');
    const vectorOptionsInput = document.getElementById('vector-options');
    const vectorIdsInput = document.getElementById('vector-ids');

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
        const status = data.error ? 'error' : 'success';
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
</html>`, { headers: { 'content-type': 'text/html' } })
    }

    if (path === '/api/health') {
      return Response.json({ ok: true, provider: 'cloudflare', timestamp: new Date().toISOString() })
    }

    // Basic sandbox test
    if (path === '/api/sandbox') {
      return handleBasicSandbox(env)
    }

    // Capabilities test
    if (path === '/api/sandbox/supports') {
      return handleSupports(env)
    }

    // mkdir test
    if (path === '/api/sandbox/mkdir') {
      return handleMkdir(env)
    }

    // File operations test
    if (path === '/api/sandbox/files') {
      return handleFiles(env)
    }

    // Streaming exec test
    if (path === '/api/sandbox/stream') {
      return handleStream(env)
    }

    // Process test
    if (path === '/api/sandbox/process') {
      return handleProcess(env)
    }

    // Git checkout test
    if (path === '/api/sandbox/git') {
      return handleGit(env)
    }

    // Session test
    if (path === '/api/sandbox/session') {
      return handleSession(env)
    }

    // Code interpreter test
    if (path === '/api/sandbox/code') {
      return handleCode(env)
    }

    // Ports test
    if (path === '/api/sandbox/ports') {
      return handlePorts(env, req)
    }

    // Workflow start
    if (path === '/api/workflow/start') {
      return handleWorkflowStart(env, req)
    }

    // Workflow status
    if (path === '/api/workflow/status') {
      return handleWorkflowStatus(env, req)
    }

    // Workflow stop
    if (path === '/api/workflow/stop') {
      return handleWorkflowStop(env, req)
    }

    // Workflow capabilities
    if (path === '/api/workflow/supports') {
      return handleWorkflowSupports(env)
    }

    // Queue supports
    if (path === '/api/queue/supports') {
      return handleQueueSupports(env)
    }

    // Queue send
    if (path === '/api/queue/send') {
      return handleQueueSend(env, req)
    }

    // Queue sendBatch
    if (path === '/api/queue/sendBatch') {
      return handleQueueSendBatch(env, req)
    }

    // Vector supports
    if (path === '/api/vector/supports') {
      return handleVectorSupports(env)
    }

    if (path === '/api/vector/index') {
      return handleVectorIndex(env, req)
    }

    if (path === '/api/vector/search') {
      return handleVectorSearch(env, req)
    }

    if (path === '/api/vector/remove') {
      return handleVectorRemove(env, req)
    }

    if (path === '/api/vector/clear') {
      return handleVectorClear(env)
    }

    return new Response('Not found', { status: 404 })
  },
}

async function handleBasicSandbox(env: Env): Promise<Response> {
  const start = Date.now()
  try {
    const sandbox = await createSandbox({ provider: { name: 'cloudflare', namespace: env.SANDBOX, getSandbox } })
    try {
      const exec = await sandbox.exec('echo', ['Hello from sandbox!'])
      await sandbox.writeFile('/tmp/test.txt', 'File content works!')
      const content = await sandbox.readFile('/tmp/test.txt')

      return Response.json({ provider: 'cloudflare', exec, content, elapsed: Date.now() - start, timestamp: new Date().toISOString() })
    }
    finally {
      await sandbox.stop()
    }
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handleMkdir(env: Env): Promise<Response> {
  const start = Date.now()
  try {
    const sandbox = await createSandbox({ provider: { name: 'cloudflare', namespace: env.SANDBOX, getSandbox } })
    try {
      await sandbox.mkdir('/tmp/test-dir')
      await sandbox.writeFile('/tmp/test-dir/file.txt', 'nested file content')
      const content = await sandbox.readFile('/tmp/test-dir/file.txt')

      await sandbox.mkdir('/tmp/nested/deep/path', { recursive: true })
      await sandbox.writeFile('/tmp/nested/deep/path/deep.txt', 'deep content')
      const deepContent = await sandbox.readFile('/tmp/nested/deep/path/deep.txt')

      return Response.json({ provider: 'cloudflare', mkdir: { success: true, content, deepContent }, elapsed: Date.now() - start, timestamp: new Date().toISOString() })
    }
    finally {
      await sandbox.stop()
    }
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handleSupports(env: Env): Promise<Response> {
  const start = Date.now()
  try {
    const sandbox = await createSandbox({ provider: { name: 'cloudflare', namespace: env.SANDBOX, getSandbox } })
    try {
      return Response.json({
        provider: 'cloudflare',
        supports: sandbox.supports,
        elapsed: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
    }
    finally {
      await sandbox.stop()
    }
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handleFiles(env: Env): Promise<Response> {
  const start = Date.now()
  try {
    const sandbox = await createSandbox({ provider: { name: 'cloudflare', namespace: env.SANDBOX, getSandbox } })
    try {
      // Create test files
      await sandbox.mkdir('/tmp/files-test')
      await sandbox.writeFile('/tmp/files-test/a.txt', 'content a')
      await sandbox.writeFile('/tmp/files-test/b.txt', 'content b')

      // List files
      const files = await sandbox.listFiles('/tmp/files-test')

      // Check exists
      const existsA = await sandbox.exists('/tmp/files-test/a.txt')
      const existsC = await sandbox.exists('/tmp/files-test/c.txt')

      // Move file
      await sandbox.moveFile('/tmp/files-test/a.txt', '/tmp/files-test/moved.txt')
      const movedContent = await sandbox.readFile('/tmp/files-test/moved.txt')
      const existsAAfterMove = await sandbox.exists('/tmp/files-test/a.txt')

      // Delete file
      await sandbox.deleteFile('/tmp/files-test/b.txt')
      const existsBAfterDelete = await sandbox.exists('/tmp/files-test/b.txt')

      return Response.json({
        provider: 'cloudflare',
        files: { list: files, existsA, existsC, movedContent, existsAAfterMove, existsBAfterDelete },
        elapsed: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
    }
    finally {
      await sandbox.stop()
    }
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handleStream(env: Env): Promise<Response> {
  const start = Date.now()
  try {
    const sandbox = await createSandbox({ provider: { name: 'cloudflare', namespace: env.SANDBOX, getSandbox } })
    try {
      const stdoutChunks: string[] = []
      const stderrChunks: string[] = []

      const result = await sandbox.exec('sh', ['-c', 'echo "line 1"; echo "line 2"; echo "error" >&2; echo "line 3"'], {
        onStdout: (data) => { stdoutChunks.push(data) },
        onStderr: (data) => { stderrChunks.push(data) },
      })

      return Response.json({
        provider: 'cloudflare',
        streaming: { result, stdoutChunks, stderrChunks },
        elapsed: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
    }
    finally {
      await sandbox.stop()
    }
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handleProcess(env: Env): Promise<Response> {
  const start = Date.now()
  try {
    const sandbox = await createSandbox({ provider: { name: 'cloudflare', namespace: env.SANDBOX, getSandbox } })
    try {
      const stdoutChunks: string[] = []
      const stderrChunks: string[] = []
      const execResult = await sandbox.exec('sh', ['-c', 'for i in 1 2 3; do echo "tick $i"; sleep 0.5; done'], {
        onStdout: data => stdoutChunks.push(data),
        onStderr: data => stderrChunks.push(data),
      })
      const stdout = stdoutChunks.join('') || execResult.stdout
      const stderr = stderrChunks.join('') || execResult.stderr
      const logResult = { foundTick2: /tick 2/.test(stdout), line: 'tick 2' }

      return Response.json({
        provider: 'cloudflare',
        process: {
          mode: 'exec-fallback',
          command: 'sh -c for i in 1 2 3; do echo "tick $i"; sleep 0.5; done',
          logResult,
          logs: { stdout, stderr },
          execResult,
        },
        elapsed: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
    }
    finally {
      await sandbox.stop()
    }
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handleGit(env: Env): Promise<Response> {
  const start = Date.now()
  try {
    const sandbox = await createSandbox({ provider: { name: 'cloudflare', namespace: env.SANDBOX, getSandbox } })
    try {
      const cf = sandbox.cloudflare
      const result = await cf.gitCheckout('https://github.com/onmax/unagent', { depth: 1 })
      return Response.json({ provider: 'cloudflare', git: result, elapsed: Date.now() - start, timestamp: new Date().toISOString() })
    }
    finally {
      await sandbox.stop()
    }
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handleSession(env: Env): Promise<Response> {
  const start = Date.now()
  try {
    const sandbox = await createSandbox({ provider: { name: 'cloudflare', namespace: env.SANDBOX, getSandbox } })
    try {
      const cf = sandbox.cloudflare
      const session = await cf.createSession({ cwd: '/tmp' })
      const execResult = await session.exec('echo "session test"')
      await cf.deleteSession(session.id)

      return Response.json({
        provider: 'cloudflare',
        session: { id: session.id, execResult },
        elapsed: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
    }
    finally {
      await sandbox.stop()
    }
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handleCode(env: Env): Promise<Response> {
  const start = Date.now()
  try {
    const sandbox = await createSandbox({ provider: { name: 'cloudflare', namespace: env.SANDBOX, getSandbox } })
    try {
      const cf = sandbox.cloudflare
      let pythonResult: unknown
      try {
        pythonResult = await cf.runCode('print("Hello from Python!")', { language: 'python' })
      }
      catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!/interpreter not available|python interpreter not available/i.test(message)) {
          throw error
        }

        const execResult = await sandbox.exec('python3', ['-c', 'print("Hello from Python!")'])
        pythonResult = {
          success: execResult.ok,
          output: execResult.stdout.trim(),
          stderr: execResult.stderr,
          fallback: 'exec-python3',
        }
      }
      const jsResult = await cf.runCode('console.log("Hello from JS!")', { language: 'javascript' })

      return Response.json({
        provider: 'cloudflare',
        code: { pythonResult, jsResult },
        elapsed: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
    }
    finally {
      await sandbox.stop()
    }
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handlePorts(env: Env, req: Request): Promise<Response> {
  const start = Date.now()
  try {
    const sandbox = await createSandbox({ provider: { name: 'cloudflare', namespace: env.SANDBOX, getSandbox } })
    try {
      const hostname = new URL(req.url).hostname
      if (hostname.endsWith('.workers.dev')) {
        return Response.json({
          provider: 'cloudflare',
          ports: {
            supported: false,
            reason: 'custom_domain_required',
            message: 'Port preview URLs require a custom domain. *.workers.dev does not support wildcard subdomains.',
            hostname,
          },
          elapsed: Date.now() - start,
          timestamp: new Date().toISOString(),
        })
      }

      const cf = sandbox.cloudflare
      const exposed = await cf.exposePort(8080, { protocol: 'http', hostname })
      const ports = await cf.getExposedPorts(hostname)

      return Response.json({
        provider: 'cloudflare',
        ports: { supported: true, hostname, exposed, list: ports },
        elapsed: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
    }
    finally {
      await sandbox.stop()
    }
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return await request.json()
  }
  catch {
    return {}
  }
}

async function handleWorkflowStart(env: Env, req: Request): Promise<Response> {
  const start = Date.now()
  try {
    const body = await readJson(req)
    const payload = (body as { payload?: unknown }).payload ?? body

    const workflow = await createWorkflow({
      provider: { name: 'cloudflare', binding: env.MY_WORKFLOW },
    })

    const run = await workflow.start(payload)
    const status = await run.status()

    return Response.json({
      provider: 'cloudflare',
      runId: run.id,
      status,
      elapsed: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handleWorkflowStatus(env: Env, req: Request): Promise<Response> {
  const start = Date.now()
  try {
    const url = new URL(req.url)
    const body = await readJson(req)
    const runId = (url.searchParams.get('runId') || (body as { runId?: string }).runId) as string | null

    if (!runId) {
      return Response.json({ error: 'Missing runId', elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 400 })
    }

    const workflow = await createWorkflow({
      provider: { name: 'cloudflare', binding: env.MY_WORKFLOW },
    })

    const run = await workflow.get(runId)
    if (!run) {
      return Response.json({ error: 'Run not found', elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 404 })
    }

    const status = await run.status()

    return Response.json({
      provider: 'cloudflare',
      runId: run.id,
      status,
      elapsed: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handleWorkflowStop(env: Env, req: Request): Promise<Response> {
  const start = Date.now()
  try {
    const url = new URL(req.url)
    const body = await readJson(req)
    const runId = (url.searchParams.get('runId') || (body as { runId?: string }).runId) as string | null

    if (!runId) {
      return Response.json({ error: 'Missing runId', elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 400 })
    }

    const workflow = await createWorkflow({
      provider: { name: 'cloudflare', binding: env.MY_WORKFLOW },
    })

    const run = await workflow.get(runId)
    if (!run) {
      return Response.json({ error: 'Run not found', elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 404 })
    }

    await run.stop()

    return Response.json({
      provider: 'cloudflare',
      runId: run.id,
      stopped: true,
      elapsed: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handleWorkflowSupports(env: Env): Promise<Response> {
  const start = Date.now()
  try {
    const workflow = await createWorkflow({
      provider: { name: 'cloudflare', binding: env.MY_WORKFLOW },
    })

    return Response.json({
      provider: 'cloudflare',
      supports: workflow.supports,
      elapsed: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handleQueueSupports(env: Env): Promise<Response> {
  const start = Date.now()
  try {
    const queue = await createQueue({
      provider: { name: 'cloudflare', binding: env.MY_QUEUE },
    })

    return Response.json({
      provider: 'cloudflare',
      supports: queue.supports,
      elapsed: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handleQueueSend(env: Env, req: Request): Promise<Response> {
  const start = Date.now()
  try {
    const body = await readJson(req)
    if (!Object.prototype.hasOwnProperty.call(body, 'payload')) {
      return Response.json({ error: 'Missing payload', elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 400 })
    }

    const { payload, options } = body as { payload: unknown, options?: Record<string, unknown> }

    const queue = await createQueue({
      provider: { name: 'cloudflare', binding: env.MY_QUEUE },
    })

    await queue.send(payload, options as any)
    return Response.json({
      provider: 'cloudflare',
      ok: true,
      elapsed: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handleQueueSendBatch(env: Env, req: Request): Promise<Response> {
  const start = Date.now()
  try {
    const body = await readJson(req)
    const messages = Array.isArray((body as any)?.messages) ? (body as any).messages : []
    const options = ((body as any)?.options && typeof (body as any).options === 'object') ? (body as any).options : {}

    if (!messages.length) {
      return Response.json({ error: 'Missing messages', elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 400 })
    }

    const queue = await createQueue({
      provider: { name: 'cloudflare', binding: env.MY_QUEUE },
    })

    if (!queue.supports.sendBatch) {
      return Response.json({ error: 'sendBatch() is not supported', elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 400 })
    }

    await queue.sendBatch?.(messages, options)
    return Response.json({
      provider: 'cloudflare',
      ok: true,
      count: messages.length,
      elapsed: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handleVectorSupports(env: Env): Promise<Response> {
  const start = Date.now()
  try {
    const vector = await getVectorClient(env)
    return Response.json({
      provider: 'cloudflare',
      supports: vector.supports,
      elapsed: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handleVectorIndex(env: Env, req: Request): Promise<Response> {
  const start = Date.now()
  try {
    const body = await readJson(req)
    const docsInput = Array.isArray(body?.docs) ? body.docs : Array.isArray(body) ? body : DEFAULT_VECTOR_DOCS
    const docs: VectorDocument[] = docsInput.map((doc: any, idx: number) => ({
      id: doc?.id ?? `doc-${idx + 1}`,
      content: doc?.content ?? String(doc ?? ''),
      metadata: doc?.metadata,
    }))

    const vector = await getVectorClient(env)
    const result = await vector.index(docs)

    return Response.json({
      provider: 'cloudflare',
      count: result.count,
      ids: docs.map(d => d.id),
      elapsed: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handleVectorSearch(env: Env, req: Request): Promise<Response> {
  const start = Date.now()
  try {
    const body = await readJson(req)
    const query = typeof body?.query === 'string'
      ? body.query
      : typeof body?.q === 'string'
        ? body.q
        : 'hello world'

    let options: VectorSearchOptions = {}
    if (body?.options && typeof body.options === 'object') {
      options = body.options
    }
    else if (body && typeof body === 'object') {
      const { query: _query, q: _q, docs: _docs, ids: _ids, ...rest } = body
      options = rest
    }

    const vector = await getVectorClient(env)
    const results = await vector.search(query, options)

    return Response.json({
      provider: 'cloudflare',
      query,
      results,
      elapsed: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handleVectorRemove(env: Env, req: Request): Promise<Response> {
  const start = Date.now()
  try {
    const body = await readJson(req)
    const ids = Array.isArray(body?.ids) ? body.ids : Array.isArray(body) ? body : []

    if (!ids.length) {
      return Response.json({ error: 'Missing ids', elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 400 })
    }

    const vector = await getVectorClient(env)
    if (!vector.remove) {
      return Response.json({ error: 'remove() is not supported', elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 400 })
    }

    const result = await vector.remove(ids)
    return Response.json({
      provider: 'cloudflare',
      count: result.count,
      elapsed: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

async function handleVectorClear(env: Env): Promise<Response> {
  const start = Date.now()
  try {
    const vector = await getVectorClient(env)
    if (!vector.clear) {
      return Response.json({ error: 'clear() is not supported', elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 400 })
    }
    await vector.clear()
    return Response.json({
      provider: 'cloudflare',
      cleared: true,
      elapsed: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() }, { status: 500 })
  }
}
