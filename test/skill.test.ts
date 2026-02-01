import { describe, expect, it } from 'vitest'
import { extractSkillName, filterSkills, parseSkillMd, validateSkillMd } from '../src/skill'

describe('skill/parse', () => {
  it('parses SKILL.md with frontmatter', () => {
    const content = `---
name: Test Skill
description: A test skill
tags:
  - test
  - example
---

# Instructions

Do something useful.`

    const result = parseSkillMd(content)
    expect(result.frontmatter.name).toBe('Test Skill')
    expect(result.frontmatter.description).toBe('A test skill')
    expect(result.frontmatter.tags).toEqual(['test', 'example'])
    expect(result.content).toContain('# Instructions')
  })

  it('parses SKILL.md without frontmatter', () => {
    const content = '# Just content\n\nNo frontmatter here.'
    const result = parseSkillMd(content)
    expect(result.frontmatter).toEqual({})
    expect(result.content).toContain('# Just content')
  })

  it('extractSkillName uses frontmatter name', () => {
    expect(extractSkillName({ name: 'My Skill' })).toBe('My Skill')
  })

  it('extractSkillName falls back to filename', () => {
    expect(extractSkillName({}, 'my-skill.md')).toBe('my skill')
  })

  it('validateSkillMd returns errors for empty content', () => {
    const errors = validateSkillMd({ frontmatter: {}, content: '', raw: '' })
    expect(errors).toContain('Skill content is empty')
  })
})

describe('skill/discover', () => {
  it('filterSkills filters by name', () => {
    const skills = [
      { name: 'Vue', filename: 'vue', path: '/a', parsed: { frontmatter: {}, content: '', raw: '' } },
      { name: 'React', filename: 'react', path: '/b', parsed: { frontmatter: {}, content: '', raw: '' } },
    ]
    const filtered = filterSkills(skills, 'vue')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe('Vue')
  })
})
