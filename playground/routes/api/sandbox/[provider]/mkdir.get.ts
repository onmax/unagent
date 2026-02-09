import type { SandboxProvider } from '../../../../server/_shared/sandbox'
import { defineEventHandler } from 'h3'
import { nowIso } from '../../../../server/_shared/http'
import { createPlaygroundSandbox } from '../../../../server/_shared/sandbox'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as SandboxProvider
  const start = Date.now()
  const { sandbox } = await createPlaygroundSandbox(event, provider)
  try {
    await sandbox.mkdir('/tmp/test-dir')
    await sandbox.writeFile('/tmp/test-dir/file.txt', 'nested file content')
    const content = await sandbox.readFile('/tmp/test-dir/file.txt')

    await sandbox.mkdir('/tmp/nested/deep/path', { recursive: true })
    await sandbox.writeFile('/tmp/nested/deep/path/deep.txt', 'deep content')
    const deepContent = await sandbox.readFile('/tmp/nested/deep/path/deep.txt')

    return {
      provider,
      mkdir: { success: true, content, deepContent },
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  finally {
    await sandbox.stop()
  }
})
