import { getSandbox, Sandbox } from '@cloudflare/sandbox'

export { Sandbox }

interface Env {
  SANDBOX: DurableObjectNamespace
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    if (url.pathname === '/api/health') {
      return Response.json({ ok: true, provider: 'cloudflare', timestamp: new Date().toISOString() })
    }

    if (url.pathname !== '/api/sandbox') {
      return new Response('Not found', { status: 404 })
    }

    const start = Date.now()
    try {
      const id = `sandbox-${Date.now()}`
      const sandbox = getSandbox(env.SANDBOX, id)

      const exec = await sandbox.exec('echo Hello from sandbox!')
      await sandbox.writeFile('/tmp/test.txt', 'File content works!')
      const file = await sandbox.readFile('/tmp/test.txt')
      await sandbox.destroy()

      return Response.json({
        provider: 'cloudflare',
        exec: { ok: exec.success, stdout: exec.stdout, stderr: exec.stderr, code: exec.exitCode },
        content: file.content,
        elapsed: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
    }
    catch (error) {
      return Response.json({
        error: error instanceof Error ? error.message : String(error),
        elapsed: Date.now() - start,
      }, { status: 500 })
    }
  },
}
