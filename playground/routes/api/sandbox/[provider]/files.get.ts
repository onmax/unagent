import type { SandboxProvider } from '../../../../server/_shared/sandbox'
import { defineEventHandler } from 'h3'
import { jsonError, nowIso } from '../../../../server/_shared/http'
import { createPlaygroundSandbox } from '../../../../server/_shared/sandbox'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as SandboxProvider
  const start = Date.now()
  const { sandbox } = await createPlaygroundSandbox(event, provider)
  try {
    if (!sandbox.supports?.listFiles || !sandbox.supports?.exists || !sandbox.supports?.moveFile || !sandbox.supports?.deleteFile) {
      return jsonError(event, 400, 'file operations are not supported for this sandbox provider', {
        provider,
        supports: sandbox.supports,
        elapsed: Date.now() - start,
      })
    }

    await sandbox.mkdir('/tmp/files-test')
    await sandbox.writeFile('/tmp/files-test/a.txt', 'content a')
    await sandbox.writeFile('/tmp/files-test/b.txt', 'content b')

    const files = await sandbox.listFiles('/tmp/files-test')
    const existsA = await sandbox.exists('/tmp/files-test/a.txt')
    const existsC = await sandbox.exists('/tmp/files-test/c.txt')

    await sandbox.moveFile('/tmp/files-test/a.txt', '/tmp/files-test/moved.txt')
    const movedContent = await sandbox.readFile('/tmp/files-test/moved.txt')
    const existsAAfterMove = await sandbox.exists('/tmp/files-test/a.txt')

    await sandbox.deleteFile('/tmp/files-test/b.txt')
    const existsBAfterDelete = await sandbox.exists('/tmp/files-test/b.txt')

    return {
      provider,
      files: { list: files, existsA, existsC, movedContent, existsAAfterMove, existsBAfterDelete },
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  finally {
    await sandbox.stop()
  }
})
