import type { DiscoveredSkill } from './discover'
import type { ResolvedAgent } from './resolve'
import { rmSync } from 'node:fs'
import { isAbsolute, join, normalize, resolve } from 'pathe'
import { expandPath, getAgentSkillsDir } from '../env/paths'
import { cloneToTemp, isTempDir } from './_internal/git/clone'
import { copyDirectory } from './_internal/link/copy'
import { createSymlink } from './_internal/link/symlink'
import { addSkillToLock, computeDirectoryHash, readSkillLock, writeSkillLock } from './_internal/lock'
import { parseSource } from './_internal/source/parse'
import { discoverSkills, findSkillByName } from './discover'
import { resolveTargetAgents } from './resolve'

const SKILL_NAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

export interface InstallSkillOptions {
  source: string
  skills?: string[]
  agents?: string[]
  /** Reserved for future local/project installs (currently ignored). */
  global?: boolean
  cwd?: string
  mode?: 'symlink' | 'copy'
}

export interface InstallSkillResultEntry { skill: string, agent: string, path: string }
export interface InstallSkillErrorEntry { skill: string, agent: string, error: string }

export interface InstallSkillResult {
  success: boolean
  installed: InstallSkillResultEntry[]
  errors: InstallSkillErrorEntry[]
}

export async function installSkill(options: InstallSkillOptions): Promise<InstallSkillResult> {
  const { source, skills: skillNames, agents: agentIds, mode = 'symlink' } = options
  const cwd = options.cwd ?? process.cwd()

  const installed: InstallSkillResultEntry[] = []
  const errors: InstallSkillErrorEntry[] = []

  // 1. Parse source
  const parsed = parseSource(source)
  let skillsDir: string
  let cloneRoot: string | undefined

  function isPathWithin(child: string, parent: string): boolean {
    const p = normalize(parent).replace(/\/+$/, '')
    const c = normalize(child)
    return c === p || c.startsWith(`${p}/`)
  }

  function resolveLocalSourcePath(raw: string): string {
    if (raw.startsWith('~'))
      return expandPath(raw)
    if (isAbsolute(raw))
      return normalize(raw)
    return resolve(cwd, raw)
  }

  // 2. Resolve source directory
  if (parsed.isLocal) {
    skillsDir = resolveLocalSourcePath(parsed.raw)
  }
  else {
    // Clone to temp
    const repoUrl = parsed.type === 'github'
      ? `https://github.com/${parsed.owner}/${parsed.repo}.git`
      : parsed.type === 'gitlab'
        ? `https://gitlab.com/${parsed.owner}/${parsed.repo}.git`
        : parsed.url || parsed.raw

    const result = cloneToTemp(repoUrl, { branch: parsed.ref, depth: 1 })
    if (!result.success) {
      return { success: false, installed, errors: [{ skill: '*', agent: '*', error: result.error || 'Failed to clone' }] }
    }

    cloneRoot = result.path
    skillsDir = cloneRoot

    if (parsed.path) {
      const candidate = resolve(cloneRoot, parsed.path)
      if (!isPathWithin(candidate, cloneRoot)) {
        cleanupTemp(cloneRoot)
        return { success: false, installed, errors: [{ skill: '*', agent: '*', error: `Invalid source path: ${parsed.path}` }] }
      }
      skillsDir = candidate
    }
  }

  // 3. Discover skills
  const discovered = discoverSkills(skillsDir, { recursive: true })
  if (discovered.length === 0) {
    if (cloneRoot)
      cleanupTemp(cloneRoot)
    return { success: false, installed, errors: [{ skill: '*', agent: '*', error: 'No skills found in source' }] }
  }

  // 4. Filter skills if specified
  let targetSkills: DiscoveredSkill[]
  if (skillNames && skillNames.length > 0) {
    targetSkills = skillNames.map(name => findSkillByName(discovered, name)).filter((s): s is DiscoveredSkill => !!s)
    const notFound = skillNames.filter(name => !targetSkills.some(s => s.name === name))
    for (const name of notFound) {
      errors.push({ skill: name, agent: '*', error: 'Skill not found in source' })
    }
  }
  else {
    targetSkills = discovered
  }

  // 5. Resolve target agents
  const targetAgents = resolveTargetAgents(agentIds)
  if (targetAgents.length === 0) {
    if (cloneRoot)
      cleanupTemp(cloneRoot)
    return { success: false, installed, errors: [{ skill: '*', agent: '*', error: 'No agents found or specified' }] }
  }

  // 6. Install each skill to each agent
  for (const skill of targetSkills) {
    for (const agent of targetAgents) {
      const result = installSkillToAgent(skill, agent, { source: parsed.raw, mode })
      if (result.success) {
        installed.push({ skill: skill.name, agent: agent.id, path: result.path! })
      }
      else {
        errors.push({ skill: skill.name, agent: agent.id, error: result.error! })
      }
    }
  }

  // 7. Cleanup temp dir if cloned
  if (cloneRoot)
    cleanupTemp(cloneRoot)

  return { success: errors.length === 0, installed, errors }
}

interface InstallToAgentResult { success: boolean, path?: string, error?: string }

function installSkillToAgent(skill: DiscoveredSkill, agent: ResolvedAgent, ctx: { source: string, mode: 'symlink' | 'copy' }): InstallToAgentResult {
  const skillsDir = getAgentSkillsDir(agent.config)
  if (!skillsDir) {
    return { success: false, error: `Agent ${agent.id} does not support skills` }
  }

  // Validate skill name to prevent path traversal
  if (!SKILL_NAME_PATTERN.test(skill.name) || skill.name.length > 64) {
    return { success: false, error: `Invalid skill name: ${skill.name}` }
  }

  const destPath = join(skillsDir, skill.name)

  // Create symlink or copy
  if (ctx.mode === 'symlink') {
    const result = createSymlink(skill.path, destPath, { force: true, relative: true })
    if (!result.success) {
      return { success: false, error: result.error }
    }
  }
  else {
    const result = copyDirectory(skill.path, destPath, { force: true })
    if (!result.success) {
      return { success: false, error: result.error }
    }
  }

  // Update lockfile
  const lock = readSkillLock(skillsDir)
  const hash = computeDirectoryHash(skill.path) || ''
  const updated = addSkillToLock(lock, skill.name, { name: skill.name, source: ctx.source, hash })
  writeSkillLock(skillsDir, updated)

  return { success: true, path: destPath }
}

function cleanupTemp(path: string): void {
  if (isTempDir(path)) {
    try {
      rmSync(path, { recursive: true, force: true })
    }
    catch {}
  }
}
