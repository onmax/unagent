import { describe, expect, it } from 'vitest'
import { agents, detectAgentByEnv } from '../src/env'

function withCleanEnv<T>(keys: string[], fn: () => T): T {
  const prev: Record<string, string | undefined> = {}
  for (const k of keys) {
    prev[k] = process.env[k]
    delete process.env[k]
  }
  try {
    return fn()
  }
  finally {
    for (const k of keys) {
      const v = prev[k]
      if (v === undefined)
        delete process.env[k]
      else
        process.env[k] = v
    }
  }
}

describe('env/detectAgentByEnv', () => {
  it('supports var=value matches', () => {
    withCleanEnv(['TERM_PROGRAM', 'TRAE'], () => {
      process.env.TERM_PROGRAM = 'Trae'
      expect(detectAgentByEnv(agents.trae)).toBe(true)
    })
  })

  it('var=value does not match when different', () => {
    withCleanEnv(['TERM_PROGRAM', 'TRAE'], () => {
      process.env.TERM_PROGRAM = 'Other'
      expect(detectAgentByEnv(agents.trae)).toBe(false)
    })
  })
})
