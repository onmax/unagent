import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createSandbox } from 'unagent/sandbox'

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  const start = Date.now()
  try {
    const sandbox = await createSandbox({ provider: { name: 'vercel', runtime: 'node24', timeout: 30_000, ports: [3000] } })

    try {
      // Access Vercel-specific namespace
      const vercel = sandbox.vercel

      // Get metadata
      const metadata = vercel.getMetadata()

      // Start a minimal HTTP server and wait for port
      const server = await sandbox.startProcess('node', ['-e', 'require("http").createServer((_,res)=>res.end("ok")).listen(3000)'])
      await server.waitForPort(3000, { timeout: 15_000 })

      // Get domain for port 3000
      const domain = vercel.domain(3000)

      // Get native SDK instance (escape hatch)
      const hasNative = !!vercel.native

      // Test readFileStream
      await sandbox.writeFile('/tmp/stream-test.txt', 'Stream content here!')
      const stream = await sandbox.readFileStream('/tmp/stream-test.txt')
      const reader = stream.getReader()
      const chunks: Uint8Array[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      const streamContent = new TextDecoder().decode(new Uint8Array(chunks.flatMap(c => [...c])))

      res.status(200).json({
        provider: 'vercel',
        supports: sandbox.supports,
        vercelNamespace: { metadata, domain, hasNative, streamContent },
        elapsed: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
    }
    finally {
      await sandbox.stop()
    }
  }
  catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() })
  }
}
