import type { SandboxProvider } from '../../../../server/_shared/sandbox'
import { defineEventHandler } from 'h3'
import { jsonError, nowIso } from '../../../../server/_shared/http'
import { createPlaygroundSandbox } from '../../../../server/_shared/sandbox'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as SandboxProvider
  const start = Date.now()
  const { sandbox } = await createPlaygroundSandbox(event, provider)
  try {
    if (provider !== 'cloudflare' || !sandbox.cloudflare) {
      return jsonError(event, 400, 'code execution is only supported on Cloudflare', {
        provider,
        elapsed: Date.now() - start,
      })
    }

    let pythonResult: unknown
    try {
      pythonResult = await sandbox.cloudflare.runCode('print("Hello from Python!")', { language: 'python' })
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!/interpreter not available|python interpreter not available/i.test(message))
        throw error

      const execResult = await sandbox.exec('python3', ['-c', 'print("Hello from Python!")'])
      pythonResult = {
        success: execResult.ok,
        output: execResult.stdout.trim(),
        stderr: execResult.stderr,
        fallback: 'exec-python3',
      }
    }

    const jsResult = await sandbox.cloudflare.runCode('console.log("Hello from JS!")', { language: 'javascript' })

    return {
      provider,
      code: { pythonResult, jsResult },
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  finally {
    await sandbox.stop()
  }
})
