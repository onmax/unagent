import { existsSync } from 'node:fs'
import { detectInstalledAgents } from '../env'
import { getAgentSkillsDir } from '../env/paths'
import { discoverSkills } from './discover'

export interface InstalledSkill {
  name: string
  path: string
  agent: string
  agentName: string
}

/**
 * List all installed skills across all detected agents
 */
export function listInstalledSkills(): InstalledSkill[] {
  const agents = detectInstalledAgents()
  const result: InstalledSkill[] = []

  for (const agent of agents) {
    const skillsDir = getAgentSkillsDir(agent.config)
    if (!skillsDir || !existsSync(skillsDir))
      continue

    const discovered = discoverSkills(skillsDir)
    for (const skill of discovered) {
      result.push({
        name: skill.name,
        path: skill.path,
        agent: agent.id,
        agentName: agent.config.name,
      })
    }
  }

  return result
}

/**
 * List installed skills grouped by agent
 */
export function listInstalledSkillsByAgent(): Map<string, InstalledSkill[]> {
  const skills = listInstalledSkills()
  const byAgent = new Map<string, InstalledSkill[]>()

  for (const skill of skills) {
    if (!byAgent.has(skill.agent))
      byAgent.set(skill.agent, [])
    byAgent.get(skill.agent)!.push(skill)
  }

  return byAgent
}
