import matter from 'gray-matter'

export interface SkillFrontmatter {
  name?: string
  description?: string
  version?: string
  author?: string
  globs?: string | string[]
  alwaysApply?: boolean
  tags?: string[]
  [key: string]: unknown
}

export interface ParsedSkill {
  frontmatter: SkillFrontmatter
  content: string
  raw: string
}

export function parseSkillMd(content: string): ParsedSkill {
  const { data, content: body } = matter(content)
  return {
    frontmatter: data as SkillFrontmatter,
    content: body.trim(),
    raw: content,
  }
}

export function extractSkillName(frontmatter: SkillFrontmatter, filename?: string): string {
  if (frontmatter.name)
    return frontmatter.name
  if (filename) {
    return filename
      .replace(/\.md$/i, '')
      .replace(/^SKILL[._-]?/i, '')
      .replace(/[._-]/g, ' ')
      .trim()
  }
  return 'Unnamed Skill'
}

export function validateSkillMd(parsed: ParsedSkill): string[] {
  const errors: string[] = []

  if (!parsed.content) {
    errors.push('Skill content is empty')
  }

  if (parsed.frontmatter.globs) {
    const globs = Array.isArray(parsed.frontmatter.globs)
      ? parsed.frontmatter.globs
      : [parsed.frontmatter.globs]
    for (const glob of globs) {
      if (typeof glob !== 'string') {
        errors.push(`Invalid glob pattern: ${glob}`)
      }
    }
  }

  return errors
}
