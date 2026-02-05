import { defineEventHandler } from 'h3'
import { nowIso } from '../../../server/_shared/http'
import { createPlaygroundSandbox } from '../../../server/_shared/sandbox'

export default defineEventHandler(async (event) => {
  const start = Date.now()
  const { provider, sandbox } = await createPlaygroundSandbox(event)
  try {
    const stdoutChunks: string[] = []
    const stderrChunks: string[] = []

    const result = await sandbox.exec('sh', ['-c', 'echo "line 1"; echo "line 2"; echo "error" >&2; echo "line 3"'], {
      onStdout: (data) => { stdoutChunks.push(data) },
      onStderr: (data) => { stderrChunks.push(data) },
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
