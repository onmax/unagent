import type { DurableObjectNamespaceLike } from 'unagent/sandbox'
import type { CloudflareWorkflowBindingLike } from 'unagent/workflow'
import { getSandbox, Sandbox } from '@cloudflare/sandbox'
import { WorkflowEntrypoint } from 'cloudflare:workers'
import { createSandbox } from 'unagent/sandbox'
import { createWorkflow } from 'unagent/workflow'

export { Sandbox }

interface Env {
  SANDBOX: DurableObjectNamespaceLike
  MY_WORKFLOW: CloudflareWorkflowBindingLike
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

  <div id="logs"></div>
  <script>
    const logs = document.getElementById('logs');
    const runIdInput = document.getElementById('workflow-run-id');
    const payloadInput = document.getElementById('workflow-payload');

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
