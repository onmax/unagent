import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createSandbox } from 'unagent/sandbox'

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  const start = Date.now()
  try {
    const sandbox = await createSandbox({ provider: { name: 'vercel', runtime: 'node24', timeout: 30_000 } })

    try {
      const stdoutChunks: string[] = []
      const stderrChunks: string[] = []

      // Test exec with streaming callbacks
      const result = await sandbox.exec('sh', ['-c', 'echo "line 1"; echo "line 2"; echo "error" >&2; echo "line 3"'], {
        onStdout: (data) => { stdoutChunks.push(data) },
        onStderr: (data) => { stderrChunks.push(data) },
      })

      res.status(200).json({
        provider: 'vercel',
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
    res.status(500).json({ error: error instanceof Error ? error.message : String(error), elapsed: Date.now() - start, timestamp: new Date().toISOString() })
  }
}
