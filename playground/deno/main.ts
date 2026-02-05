import { Sandbox } from '@deno/sandbox'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

function html(content: string): Response {
  return new Response(content, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Deno Sandbox Playground</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
    <style>
      :root { color-scheme: light; }
      body { margin: 0; }
      main { max-width: 720px; margin: 8vh auto; }
      pre { white-space: pre-wrap; }
      .badge { display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem; }
      .buttons { display: flex; gap: 8px; flex-wrap: wrap; }
    </style>
  </head>
  <body>
    <main class="container">
      <article>
        <header>
          <h1>Deno Sandbox Playground</h1>
          <p>Test isolated sandbox execution with @deno/sandbox</p>
        </header>
        <div class="buttons">
          <button id="health">Health Check</button>
          <button id="sandbox">Run Sandbox</button>
        </div>
        <p id="error" style="display:none"></p>
        <pre id="output" style="display:none"></pre>
      </article>
    </main>
    <script>
      const output = document.getElementById('output')
      const error = document.getElementById('error')

      async function runEndpoint(endpoint, btn) {
        const originalText = btn.textContent
        btn.disabled = true
        btn.textContent = 'Running...'
        error.style.display = 'none'
        output.style.display = 'none'
        try {
          const res = await fetch(endpoint)
          const data = await res.json()
          output.textContent = JSON.stringify(data, null, 2)
          output.style.display = 'block'
          if (!data.ok) {
            error.textContent = data.error || 'Request failed'
            error.style.color = 'var(--pico-color-red-600)'
            error.style.display = 'block'
          }
        } catch (err) {
          error.textContent = err?.message || 'Unexpected error'
          error.style.color = 'var(--pico-color-red-600)'
          error.style.display = 'block'
        } finally {
          btn.disabled = false
          btn.textContent = originalText
        }
      }

      document.getElementById('health').addEventListener('click', (e) => runEndpoint('/health', e.target))
      document.getElementById('sandbox').addEventListener('click', (e) => runEndpoint('/sandbox', e.target))
    </script>
  </body>
</html>`

async function waitForSandboxPort(sandbox: Sandbox, port: number, timeoutMs = 10_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await sandbox.fetch(`http://127.0.0.1:${port}`)
      if (res.ok || res.status >= 400)
        return
    }
    catch { /* ignore */ }
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  throw new Error(`Timeout waiting for port ${port}`)
}

Deno.serve(async (req) => {
  const { pathname } = new URL(req.url)

  if (pathname === '/' || pathname === '/index.html') {
    return html(indexHtml)
  }

  if (pathname === '/health') {
    return json({ ok: true, timestamp: new Date().toISOString() })
  }

  if (pathname === '/sandbox') {
    const start = Date.now()
    let sandbox: Sandbox | undefined

    try {
      sandbox = await Sandbox.create({ timeout: '5m' })

      // Use spawn instead of sh for more reliable execution
      const echoProc = await sandbox.spawn('sh', {
        args: ['-c', 'echo "hello from deno sandbox"'],
        stdout: 'piped',
        stderr: 'piped',
      })
      const echoOutput = await echoProc.output()

      await sandbox.fs.writeTextFile('/tmp/hello.txt', 'hello from fs')
      const content = await sandbox.fs.readTextFile('/tmp/hello.txt')

      const serverCode = `Deno.serve({ port: 8080 }, () => new Response("ok"));`
      await sandbox.fs.writeTextFile('/tmp/server.ts', serverCode)

      const server = await sandbox.spawn('deno', {
        args: ['run', '--allow-net', '/tmp/server.ts'],
        stdout: 'piped',
        stderr: 'piped',
      })

      await waitForSandboxPort(sandbox, 8080)
      const url = await sandbox.exposeHttp({ port: 8080 })
      const fetchRes = await fetch(url)
      const fetchText = await fetchRes.text()

      await server.kill()

      return json({
        ok: true,
        exec: {
          stdout: echoOutput.stdoutText,
          stderr: echoOutput.stderrText,
          status: echoOutput.status,
        },
        fileContent: content,
        exposedUrl: url,
        exposedResponse: fetchText,
        elapsed: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
    }
    catch (error) {
      return json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        elapsed: Date.now() - start,
        timestamp: new Date().toISOString(),
      }, 500)
    }
    finally {
      if (sandbox) {
        try {
          await sandbox.close()
        }
        catch {
          await sandbox.kill()
        }
      }
    }
  }

  return json({ ok: false, error: 'Not found' }, 404)
})
