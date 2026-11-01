import { mkdtempSync, rmSync } from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import os from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, vi } from 'vitest'
import { agents } from '../../src/env'

export function useAgentHome(): () => string {
  let directory: string

  beforeEach(() => {
    directory = mkdtempSync(join(process.cwd(), '.test-agent-home-'))
    vi.spyOn(os, 'homedir').mockReturnValue(directory)
    syncBuiltinESMExports()
    for (const agent of Object.values(agents)) {
      for (const entry of agent.envDetect ?? [])
        vi.stubEnv(entry.split('=')[0], undefined)
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    syncBuiltinESMExports()
    vi.unstubAllEnvs()
    rmSync(directory, { recursive: true, force: true })
  })

  return () => directory
}
