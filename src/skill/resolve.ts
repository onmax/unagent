import type { AgentConfig } from '../env/agents'
import { getAgentConfig } from '../env/agents'
import { detectInstalledAgents } from '../env/detect'

export interface ResolvedAgent {
  id: string
  config: AgentConfig
}

export function resolveTargetAgents(agentIds?: string[]): ResolvedAgent[] {
  if (agentIds && agentIds.length > 0) {
    return agentIds.map((id) => {
      const config = getAgentConfig(id)
      return config ? { id, config } : null
    }).filter((a): a is ResolvedAgent => !!a)
  }

  const detected = detectInstalledAgents()
  return detected.filter(d => d.config.skillsDir).map(d => ({ id: d.id, config: d.config }))
}
