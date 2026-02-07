import type { ResolvedAgent } from './resolve'
import { existsSync, rmSync } from 'node:fs'
import { join } from 'pathe'
import { getAgentSkillsDirs } from '../env/paths'
import { isSymlink, removeSymlink } from './_internal/link/symlink'
import { readSkillLock, removeSkillFromLock, writeSkillLock } from './_internal/lock'
import { resolveTargetAgents } from './resolve'

const SKILL_NAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

export interface UninstallSkillOptions {
  skill: string
  agents?: string[]
  global?: boolean
  cwd?: string
}

export interface UninstallSkillResultEntry { skill: string, agent: string, path: string }
export interface UninstallSkillErrorEntry { skill: string, agent: string, error: string }

export interface UninstallSkillResult {
  success: boolean
  removed: UninstallSkillResultEntry[]
  errors: UninstallSkillErrorEntry[]
}

export async function uninstallSkill(options: UninstallSkillOptions): Promise<UninstallSkillResult> {
  const { skill: skillName, agents: agentIds } = options

  const removed: UninstallSkillResultEntry[] = []
  const errors: UninstallSkillErrorEntry[] = []

  // Resolve target agents
  const targetAgents = resolveTargetAgents(agentIds)
  if (targetAgents.length === 0) {
    return { success: false, removed, errors: [{ skill: skillName, agent: '*', error: 'No agents found or specified' }] }
  }

  // Uninstall from each agent
  for (const agent of targetAgents) {
    const result = uninstallSkillFromAgent(skillName, agent)
    if (result.success) {
      for (const path of result.paths || []) {
        removed.push({ skill: skillName, agent: agent.id, path })
      }
    }
    else if (result.error !== 'Skill not installed') {
      errors.push({ skill: skillName, agent: agent.id, error: result.error! })
    }
  }

  return { success: errors.length === 0 && removed.length > 0, removed, errors }
}

interface UninstallFromAgentResult { success: boolean, paths?: string[], error?: string }

function uninstallSkillFromAgent(skillName: string, agent: ResolvedAgent): UninstallFromAgentResult {
  const skillsDirs = getAgentSkillsDirs(agent.config)
  if (skillsDirs.length === 0) {
    return { success: false, error: `Agent ${agent.id} does not support skills` }
  }

  // Validate skill name to prevent path traversal
  if (!SKILL_NAME_PATTERN.test(skillName) || skillName.length > 64) {
    return { success: false, error: `Invalid skill name: ${skillName}` }
  }

  const removedPaths: string[] = []

  for (const skillsDir of skillsDirs) {
    const skillPath = join(skillsDir, skillName)
    if (!existsSync(skillPath))
      continue

    // Remove symlink or directory
    if (isSymlink(skillPath)) {
      if (!removeSymlink(skillPath)) {
        return { success: false, error: 'Failed to remove symlink' }
      }
    }
    else {
      try {
        rmSync(skillPath, { recursive: true, force: true })
      }
      catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Failed to remove directory' }
      }
    }

    // Update lockfile
    const lock = readSkillLock(skillsDir)
    const updated = removeSkillFromLock(lock, skillName)
    writeSkillLock(skillsDir, updated)

    removedPaths.push(skillPath)
  }

  if (removedPaths.length === 0) {
    return { success: false, error: 'Skill not installed' }
  }

  return { success: true, paths: removedPaths }
}
