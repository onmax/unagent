import type { AgentConfig } from './agents'
import { existsSync } from 'node:fs'
import { agents, getAgentConfig } from './agents'
import { agentConfigExists } from './paths'

export interface DetectedAgent {
  id: string
  config: AgentConfig
  detected: 'env' | 'config' | 'both'
}

export function detectAgentByEnv(agent: AgentConfig): boolean {
  if (!agent.envDetect)
    return false
  return agent.envDetect.some((entry) => {
    const eq = entry.indexOf('=')
    if (eq === -1)
      return !!process.env[entry]

    const key = entry.slice(0, eq).trim()
    const expected = entry.slice(eq + 1).trim()
    const actual = process.env[key]
    if (actual == null)
      return false
    return actual.toLowerCase() === expected.toLowerCase()
  })
}

export function detectCurrentAgent(): DetectedAgent | undefined {
  for (const [id, config] of Object.entries(agents)) {
    if (detectAgentByEnv(config)) {
      const hasConfig = agentConfigExists(config)
      return { id, config, detected: hasConfig ? 'both' : 'env' }
    }
  }
  return undefined
}

export function detectInstalledAgents(): DetectedAgent[] {
  const detected: DetectedAgent[] = []

  for (const [id, config] of Object.entries(agents)) {
    const envDetected = detectAgentByEnv(config)
    const configExists = agentConfigExists(config)

    if (envDetected || configExists) {
      detected.push({
        id,
        config,
        detected: envDetected && configExists ? 'both' : envDetected ? 'env' : 'config',
      })
    }
  }

  return detected
}

export function isRunningInAgent(agentId: string): boolean {
  const config = getAgentConfig(agentId)
  if (!config)
    return false
  return detectAgentByEnv(config)
}

export interface DetermineAgentOptions {
  /**
   * Override for filesystem checks (used for tests).
   */
  fsExists?: (path: string) => boolean
}

export interface DeterminedAgent {
  id: string
  detectedBy: 'ai_agent' | 'env' | 'fs'
}

const DEVIN_LOCAL_PATH = '/opt/.devin'

const VERCEL_NAME_TO_UNAGENT_ID: Record<string, string> = {
  'cursor': 'cursor',
  'cursor-cli': 'cursor-cli',
  'claude': 'claude-code',
  'devin': 'devin',
  'replit': 'replit-agent',
  'gemini': 'gemini-cli',
  'codex': 'codex',
  'augment-cli': 'augment-cli',
  'opencode': 'opencode',
}

function normalizeAI_AGENT(value: string): string | undefined {
  const v = value.trim()
  if (!v)
    return undefined

  // Accept unagent IDs directly.
  if (agents[v])
    return v

  // Accept Vercel detect-agent names.
  if (VERCEL_NAME_TO_UNAGENT_ID[v])
    return VERCEL_NAME_TO_UNAGENT_ID[v]

  return undefined
}

export function determineAgent(options: DetermineAgentOptions = {}): DeterminedAgent | undefined {
  const aiAgent = process.env.AI_AGENT
  if (aiAgent) {
    const id = normalizeAI_AGENT(aiAgent)
    if (id)
      return { id, detectedBy: 'ai_agent' }
  }

  // Vercel detect-agent parity: precedence matters.
  if (process.env.CURSOR_TRACE_ID)
    return { id: 'cursor', detectedBy: 'env' }

  if (process.env.CURSOR_AGENT)
    return { id: 'cursor-cli', detectedBy: 'env' }

  if (process.env.GEMINI_CLI)
    return { id: 'gemini-cli', detectedBy: 'env' }

  if (process.env.CODEX_SANDBOX)
    return { id: 'codex', detectedBy: 'env' }

  if (process.env.AUGMENT_AGENT)
    return { id: 'augment-cli', detectedBy: 'env' }

  if (process.env.OPENCODE_CLIENT)
    return { id: 'opencode', detectedBy: 'env' }

  if (process.env.CLAUDECODE || process.env.CLAUDE_CODE)
    return { id: 'claude-code', detectedBy: 'env' }

  if (process.env.REPL_ID)
    return { id: 'replit-agent', detectedBy: 'env' }

  const fsExists = options.fsExists ?? existsSync
  try {
    if (fsExists(DEVIN_LOCAL_PATH))
      return { id: 'devin', detectedBy: 'fs' }
  }
  catch {
    // ignore
  }

  return undefined
}
