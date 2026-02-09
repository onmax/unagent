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
    const execResult = await sandbox.exec('sh', ['-c', 'for i in 1 2 3; do echo "tick $i"; sleep 0.5; done'], {
      onStdout: (data: string) => stdoutChunks.push(data),
      onStderr: (data: string) => stderrChunks.push(data),
    })

    const stdout = stdoutChunks.join('') || execResult.stdout
    const stderr = stderrChunks.join('') || execResult.stderr
    const logResult = { foundTick2: /tick 2/.test(stdout), line: 'tick 2' }

    return {
      provider,
      process: {
        mode: 'exec-fallback',
        command: 'sh -c for i in 1 2 3; do echo "tick $i"; sleep 0.5; done',
        logResult,
        logs: { stdout, stderr },
        execResult,
      },
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  finally {
    await sandbox.stop()
  }
})
