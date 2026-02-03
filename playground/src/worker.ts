import type { DurableObjectNamespaceLike } from 'unagent/sandbox'
import { getSandbox, Sandbox } from '@cloudflare/sandbox'
import { createSandbox } from 'unagent/sandbox'

export { Sandbox }

interface Env {
  SANDBOX: DurableObjectNamespaceLike
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
      const sandbox = await createSandbox({
        provider: {
          name: 'cloudflare',
          namespace: env.SANDBOX,
          getSandbox,
        },
      })
      try {
        const exec = await sandbox.exec('echo', ['Hello from sandbox!'])
        await sandbox.writeFile('/tmp/test.txt', 'File content works!')
        const content = await sandbox.readFile('/tmp/test.txt')

        return Response.json({
          provider: 'cloudflare',
          exec,
          content,
          elapsed: Date.now() - start,
          timestamp: new Date().toISOString(),
        })
      }
      finally {
        await sandbox.stop()
      }
    }
    catch (error) {
      return Response.json({
        error: error instanceof Error ? error.message : String(error),
        elapsed: Date.now() - start,
        timestamp: new Date().toISOString(),
      }, { status: 500 })
    }
  },
}
