import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Buffer } from 'node:buffer'
import { Sandbox } from '@vercel/sandbox'

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  const start = Date.now()
  try {
    const sandbox = await Sandbox.create({ runtime: 'node24', timeout: 30_000 })
    const createTime = Date.now() - start

    const result = await sandbox.runCommand('echo', ['Hello from sandbox!'])
    const [stdout, stderr] = await Promise.all([result.stdout(), result.stderr()])

    await sandbox.writeFiles([{ path: '/tmp/test.txt', content: Buffer.from('File content works!') }])
    const buffer = await sandbox.readFileToBuffer({ path: '/tmp/test.txt' })

    // @ts-expect-error Symbol.asyncDispose
    await sandbox[Symbol.asyncDispose]()

    res.status(200).json({
      provider: 'vercel',
      createTime,
      exec: { ok: result.exitCode === 0, stdout, stderr, code: result.exitCode },
      content: buffer.toString(),
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      elapsed: Date.now() - start,
    })
  }
}
