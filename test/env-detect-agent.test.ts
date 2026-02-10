import { describe, expect, it } from 'vitest'
import { agents, detectAgentByEnv, determineAgent } from '../src/env'

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

const DETERMINE_AGENT_KEYS = [
  'AI_AGENT',
  'CURSOR_TRACE_ID',
  'CURSOR_AGENT',
  'GEMINI_CLI',
  'CODEX_SANDBOX',
  'AUGMENT_AGENT',
  'OPENCODE_CLIENT',
  'CLAUDECODE',
  'CLAUDE_CODE',
  'REPL_ID',
]

describe('env/determineAgent', () => {
  it('respects AI_AGENT override (unagent id)', () => {
    withCleanEnv(DETERMINE_AGENT_KEYS, () => {
      process.env.AI_AGENT = 'cursor'
      process.env.CURSOR_TRACE_ID = 'x'
      expect(determineAgent()).toEqual({ id: 'cursor', detectedBy: 'ai_agent' })
    })
  })

  it('maps AI_AGENT from Vercel names', () => {
    withCleanEnv(DETERMINE_AGENT_KEYS, () => {
      process.env.AI_AGENT = 'claude'
      expect(determineAgent()).toEqual({ id: 'claude-code', detectedBy: 'ai_agent' })
    })
  })

  it('detects Cursor via CURSOR_TRACE_ID', () => {
    withCleanEnv(DETERMINE_AGENT_KEYS, () => {
      process.env.CURSOR_TRACE_ID = 'x'
      expect(determineAgent()).toEqual({ id: 'cursor', detectedBy: 'env' })
    })
  })

  it('detects cursor cli via CURSOR_AGENT', () => {
    withCleanEnv(DETERMINE_AGENT_KEYS, () => {
      process.env.CURSOR_AGENT = '1'
      expect(determineAgent()).toEqual({ id: 'cursor-cli', detectedBy: 'env' })
    })
  })

  it('detects Devin via filesystem check when no env matches', () => {
    withCleanEnv(DETERMINE_AGENT_KEYS, () => {
      expect(determineAgent({ fsExists: () => true })).toEqual({ id: 'devin', detectedBy: 'fs' })
    })
  })
})

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
