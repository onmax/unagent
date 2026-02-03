import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createSandbox } from 'unagent/sandbox'

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  const start = Date.now()
  try {
    const sandbox = await createSandbox({ provider: { name: 'vercel', runtime: 'node24', timeout: 30_000 } })

    try {
      // Test mkdir
      await sandbox.mkdir('/tmp/test-dir')
      await sandbox.writeFile('/tmp/test-dir/file.txt', 'nested file content')
      const content = await sandbox.readFile('/tmp/test-dir/file.txt')

      // Test nested mkdir
      await sandbox.mkdir('/tmp/nested/deep/path', { recursive: true })
      await sandbox.writeFile('/tmp/nested/deep/path/deep.txt', 'deep content')
      const deepContent = await sandbox.readFile('/tmp/nested/deep/path/deep.txt')

      res.status(200).json({
        provider: 'vercel',
        mkdir: { success: true, content, deepContent },
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
