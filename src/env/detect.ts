import type { AgentConfig } from './agents'
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
