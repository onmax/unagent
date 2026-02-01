import type { ParsedSkill } from './parse'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { extractSkillName, parseSkillMd } from './parse'

export interface DiscoveredSkill {
  path: string
  filename: string
  name: string
  parsed: ParsedSkill
}

export interface DiscoverOptions {
  recursive?: boolean
  extensions?: string[]
}

const DEFAULT_EXTENSIONS = ['.md']

export function discoverSkills(dir: string, options: DiscoverOptions = {}): DiscoveredSkill[] {
  const { recursive = false, extensions = DEFAULT_EXTENSIONS } = options

  if (!existsSync(dir))
    return []

  const skills: DiscoveredSkill[] = []
  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory() && recursive) {
      skills.push(...discoverSkills(fullPath, options))
    }
    else if (stat.isFile() && extensions.includes(extname(entry).toLowerCase())) {
      try {
        const content = readFileSync(fullPath, 'utf-8')
        const parsed = parseSkillMd(content)
        const filename = basename(entry, extname(entry))
        skills.push({
          path: fullPath,
          filename,
          name: extractSkillName(parsed.frontmatter, filename),
          parsed,
        })
      }
      catch {
        // skip invalid files
      }
    }
  }

  return skills
}

export function filterSkills(skills: DiscoveredSkill[], query: string): DiscoveredSkill[] {
  const lowerQuery = query.toLowerCase()
  return skills.filter((skill) => {
    const nameMatch = skill.name.toLowerCase().includes(lowerQuery)
    const filenameMatch = skill.filename.toLowerCase().includes(lowerQuery)
    const tagMatch = skill.parsed.frontmatter.tags?.some(tag =>
      tag.toLowerCase().includes(lowerQuery),
    )
    return nameMatch || filenameMatch || tagMatch
  })
}

export function findSkillByName(skills: DiscoveredSkill[], name: string): DiscoveredSkill | undefined {
  const lowerName = name.toLowerCase()
  return skills.find(skill =>
    skill.name.toLowerCase() === lowerName || skill.filename.toLowerCase() === lowerName,
  )
}
