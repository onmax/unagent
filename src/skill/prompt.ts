import type { DiscoveredSkill } from './discover'

export function toPromptXml(skills: DiscoveredSkill[]): string {
  if (skills.length === 0) return ''

  const skillsXml = skills.map((skill) => {
    return `  <skill>
    <name>${escapeXml(skill.name)}</name>
    <description>${escapeXml(skill.parsed.frontmatter.description || '')}</description>
    <location>${escapeXml(skill.path)}</location>
  </skill>`
  }).join('\n')

  return `<available_skills>\n${skillsXml}\n</available_skills>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
