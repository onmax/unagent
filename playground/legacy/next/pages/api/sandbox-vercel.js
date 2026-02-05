import { createSandbox } from 'unagent/sandbox'

export const config = { runtime: 'nodejs' }

export default async function handler(_req, res) {
  const start = Date.now()
  try {
    const sandbox = await createSandbox({ provider: { name: 'vercel', runtime: 'node24', timeout: 30_000, ports: [3000] } })

    try {
      const vercel = sandbox.vercel
      const metadata = vercel.getMetadata()

      const server = await sandbox.startProcess('node', ['-e', 'require("http").createServer((_,res)=>res.end("ok")).listen(3000)'])
      await server.waitForPort(3000, { timeout: 15_000 })

      const domain = vercel.domain(3000)
      const hasNative = !!vercel.native

      await sandbox.writeFile('/tmp/stream-test.txt', 'Stream content here!')
      const stream = await sandbox.readFileStream('/tmp/stream-test.txt')
      const reader = stream.getReader()
      const chunks = []
      while (true) {
        const { done, value } = await reader.read()
        if (done)
          break
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
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      elapsed: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  }
}
