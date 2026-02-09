import type { SandboxProvider } from '../../../../server/_shared/sandbox'
import { defineEventHandler } from 'h3'
import { nowIso } from '../../../../server/_shared/http'
import { createPlaygroundSandbox } from '../../../../server/_shared/sandbox'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as SandboxProvider
  const start = Date.now()
  const { sandbox } = await createPlaygroundSandbox(event, provider)
  try {
    const stdoutChunks: string[] = []
    const stderrChunks: string[] = []

    const result = await sandbox.exec('sh', ['-c', 'echo "line 1"; echo "line 2"; echo "error" >&2; echo "line 3"'], {
      onStdout: (data: string) => { stdoutChunks.push(data) },
      onStderr: (data: string) => { stderrChunks.push(data) },
    })

    return {
      provider,
      streaming: { result, stdoutChunks, stderrChunks },
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  finally {
    await sandbox.stop()
  }
})
