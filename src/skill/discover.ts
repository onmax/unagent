import type { ParsedSkill } from './parse'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join } from 'pathe'
import { parseSkillMd } from './parse'

export interface DiscoveredSkill {
  path: string // path to skill directory
  name: string // directory name = skill name
  parsed: ParsedSkill
}

export interface DiscoverOptions {
  recursive?: boolean
}

const SKILL_FILE = 'SKILL.md'

function expandTilde(path: string): string {
  if (path === '~')
    return homedir()
  if (path.startsWith('~/') || path.startsWith('~\\'))
    return join(homedir(), path.slice(2))
  // Do not expand "~user" forms
  return path
}

export function discoverSkills(dir: string, options: DiscoverOptions = {}): DiscoveredSkill[] {
  const { recursive = false } = options

  const baseDir = expandTilde(dir)

  if (!existsSync(baseDir))
    return []

  const skills: DiscoveredSkill[] = []
  const entries = readdirSync(baseDir)

  for (const entry of entries) {
    const fullPath = join(baseDir, entry)
    const stat = statSync(fullPath)

    if (!stat.isDirectory())
      continue

    const skillFile = join(fullPath, SKILL_FILE)
    if (existsSync(skillFile)) {
      try {
        const content = readFileSync(skillFile, 'utf-8')
        const parsed = parseSkillMd(content)
        skills.push({
          path: fullPath,
          name: basename(fullPath),
          parsed,
        })
      }
      catch {
        // skip invalid files
      }
    }
    else if (recursive) {
      skills.push(...discoverSkills(fullPath, options))
    }
  }

  return skills
}

export function filterSkills(skills: DiscoveredSkill[], query: string): DiscoveredSkill[] {
  const lowerQuery = query.toLowerCase()
  return skills.filter((skill) => {
    const nameMatch = skill.name.toLowerCase().includes(lowerQuery)
    const descMatch = skill.parsed.frontmatter.description?.toLowerCase().includes(lowerQuery)
    const tagMatch = skill.parsed.frontmatter.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    return nameMatch || descMatch || tagMatch
  })
}

export function findSkillByName(skills: DiscoveredSkill[], name: string): DiscoveredSkill | undefined {
  const lowerName = name.toLowerCase()
  return skills.find(skill => skill.name.toLowerCase() === lowerName)
}
