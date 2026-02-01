import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { discoverSkills, extractSkillName, filterSkills, parseSkillMd, toPromptXml, validateSkill, validateSkillMd } from '../src/skill'

describe('skill/parse', () => {
  it('parses SKILL.md with frontmatter', () => {
    const content = `---
name: test-skill
description: A test skill
tags:
  - test
  - example
---

# Instructions

Do something useful.`

    const result = parseSkillMd(content)
    expect(result.frontmatter.name).toBe('test-skill')
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
    expect(extractSkillName({ name: 'my-skill', description: 'test' })).toBe('my-skill')
  })

  it('extractSkillName falls back to filename', () => {
    expect(extractSkillName({ name: '', description: '' }, 'my-skill.md')).toBe('my skill')
  })

  it('validateSkillMd returns errors for empty content', () => {
    const errors = validateSkillMd({ frontmatter: { name: '', description: '' }, content: '', raw: '' })
    expect(errors).toContain('Skill content is empty')
  })
})

describe('skill/validate', () => {
  it('validates spec-compliant skill', () => {
    const result = validateSkill({
      frontmatter: { name: 'pdf-processing', description: 'Extracts text from PDFs' },
      content: '# Instructions',
      raw: '',
    }, 'pdf-processing')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects missing name', () => {
    const result = validateSkill({ frontmatter: { name: '', description: 'test' }, content: '', raw: '' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('name is required')
  })

  it('rejects missing description', () => {
    const result = validateSkill({ frontmatter: { name: 'test', description: '' }, content: '', raw: '' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('description is required')
  })

  it('rejects invalid name format', () => {
    const result = validateSkill({ frontmatter: { name: 'Invalid Name', description: 'test' }, content: '', raw: '' })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('lowercase'))).toBe(true)
  })

  it('rejects name with consecutive hyphens', () => {
    const result = validateSkill({ frontmatter: { name: 'bad--name', description: 'test' }, content: '', raw: '' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('name cannot contain consecutive hyphens')
  })

  it('rejects name mismatch with dir', () => {
    const result = validateSkill({ frontmatter: { name: 'foo', description: 'test' }, content: '', raw: '' }, 'bar')
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('must match directory'))).toBe(true)
  })

  it('rejects long compatibility', () => {
    const result = validateSkill({
      frontmatter: { name: 'test', description: 'test', compatibility: 'x'.repeat(501) },
      content: '',
      raw: '',
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('compatibility must be max 500 characters')
  })

  it('warns on empty content', () => {
    const result = validateSkill({ frontmatter: { name: 'test', description: 'test' }, content: '', raw: '' })
    expect(result.warnings).toContain('skill content is empty')
  })
})

describe('skill/discover', () => {
  const testDir = join(process.cwd(), '.test-skills')

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true })
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  it('discovers skills in directories with SKILL.md', () => {
    const skillDir = join(testDir, 'my-skill')
    mkdirSync(skillDir)
    writeFileSync(join(skillDir, 'SKILL.md'), `---
name: my-skill
description: Test skill
---
Content`)

    const skills = discoverSkills(testDir)
    expect(skills).toHaveLength(1)
    expect(skills[0].name).toBe('my-skill')
    expect(skills[0].path).toBe(skillDir)
  })

  it('ignores directories without SKILL.md', () => {
    mkdirSync(join(testDir, 'no-skill'))
    writeFileSync(join(testDir, 'no-skill', 'README.md'), 'Not a skill')

    const skills = discoverSkills(testDir)
    expect(skills).toHaveLength(0)
  })

  it('discovers nested skills with recursive option', () => {
    const nestedDir = join(testDir, 'category', 'nested-skill')
    mkdirSync(nestedDir, { recursive: true })
    writeFileSync(join(nestedDir, 'SKILL.md'), `---
name: nested-skill
description: Nested
---
Content`)

    const skills = discoverSkills(testDir, { recursive: true })
    expect(skills).toHaveLength(1)
    expect(skills[0].name).toBe('nested-skill')
  })

  it('filterSkills filters by name', () => {
    const skills = [
      { name: 'vue', path: '/a', parsed: { frontmatter: { name: 'vue', description: '' }, content: '', raw: '' } },
      { name: 'react', path: '/b', parsed: { frontmatter: { name: 'react', description: '' }, content: '', raw: '' } },
    ]
    const filtered = filterSkills(skills, 'vue')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe('vue')
  })
})

describe('skill/prompt', () => {
  it('generates XML for skills', () => {
    const skills = [{
      name: 'pdf-processing',
      path: '/skills/pdf-processing',
      parsed: { frontmatter: { name: 'pdf-processing', description: 'Extracts text from PDFs' }, content: '', raw: '' },
    }]
    const xml = toPromptXml(skills)
    expect(xml).toContain('<available_skills>')
    expect(xml).toContain('<name>pdf-processing</name>')
    expect(xml).toContain('<description>Extracts text from PDFs</description>')
    expect(xml).toContain('<location>/skills/pdf-processing</location>')
  })

  it('escapes special characters', () => {
    const skills = [{
      name: 'test',
      path: '/path',
      parsed: { frontmatter: { name: 'test', description: 'Uses <xml> & "quotes"' }, content: '', raw: '' },
    }]
    const xml = toPromptXml(skills)
    expect(xml).toContain('&lt;xml&gt;')
    expect(xml).toContain('&amp;')
    expect(xml).toContain('&quot;quotes&quot;')
  })

  it('returns empty string for no skills', () => {
    expect(toPromptXml([])).toBe('')
  })
})
