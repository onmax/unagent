import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { discoverSkills, extractSkillName, filterSkills, installSkill, parseSkillMd, toPromptXml, uninstallSkill, validateSkill, validateSkillMd } from '../src/skill'

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

  it('expands ~ in discovery path', () => {
    const oldHome = process.env.HOME
    const oldUserProfile = process.env.USERPROFILE

    const home = mkdtempSync(join(tmpdir(), 'unagent-home-'))
    process.env.HOME = home
    process.env.USERPROFILE = home

    try {
      const skillsBase = join(home, 'my-skills')
      const skillDir = join(skillsBase, 'my-skill')
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(join(skillDir, 'SKILL.md'), `---
name: my-skill
description: Test skill
---
Content`)

      const skills = discoverSkills('~/my-skills')
      expect(skills).toHaveLength(1)
      expect(skills[0].name).toBe('my-skill')
      expect(skills[0].path).toBe(skillDir)
    }
    finally {
      process.env.HOME = oldHome
      process.env.USERPROFILE = oldUserProfile
      rmSync(home, { recursive: true, force: true })
    }
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

describe('skill/install', () => {
  const testDir = join(process.cwd(), '.test-install')
  const sourceDir = join(testDir, 'source')
  const targetDir = join(testDir, 'target')

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true })
    mkdirSync(sourceDir, { recursive: true })
    mkdirSync(targetDir, { recursive: true })

    // Create a test skill in source
    const skillDir = join(sourceDir, 'test-skill')
    mkdirSync(skillDir)
    writeFileSync(join(skillDir, 'SKILL.md'), `---
name: test-skill
description: A test skill
---
Instructions here`)
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  it('installs skill from local path', async () => {
    const result = await installSkill({
      source: sourceDir,
      skills: ['test-skill'],
      agents: ['claude-code'],
    })

    // Should fail gracefully since claude-code dir doesn't exist in test env
    expect(result).toBeDefined()
    expect(Array.isArray(result.installed)).toBe(true)
    expect(Array.isArray(result.errors)).toBe(true)
  })

  it('resolves relative local sources against cwd', async () => {
    const oldHome = process.env.HOME
    const oldUserProfile = process.env.USERPROFILE

    const home = mkdtempSync(join(tmpdir(), 'unagent-home-install-'))
    process.env.HOME = home
    process.env.USERPROFILE = home

    try {
      const cwd = targetDir
      const result = await installSkill({
        source: '../source',
        cwd,
        skills: ['test-skill'],
        agents: ['claude-code'],
      })

      // We only care that resolution did not produce a "No skills found" error.
      expect(result.errors.some(e => e.error.includes('No skills found'))).toBe(false)
    }
    finally {
      process.env.HOME = oldHome
      process.env.USERPROFILE = oldUserProfile
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('returns error for non-existent skill', async () => {
    const result = await installSkill({
      source: sourceDir,
      skills: ['non-existent'],
      agents: ['claude-code'],
    })

    expect(result.errors.some(e => e.skill === 'non-existent')).toBe(true)
  })

  it('returns error for empty source', async () => {
    const emptyDir = join(testDir, 'empty')
    mkdirSync(emptyDir)

    const result = await installSkill({
      source: emptyDir,
      agents: ['claude-code'],
    })

    expect(result.success).toBe(false)
    expect(result.errors.some(e => e.error.includes('No skills found'))).toBe(true)
  })
})

describe('skill/uninstall', () => {
  it('returns error when no agents specified and none detected', async () => {
    const result = await uninstallSkill({
      skill: 'non-existent',
      agents: [],
    })

    // With empty agents array, should try to detect and likely fail
    expect(result).toBeDefined()
  })

  it('handles non-existent skill gracefully', async () => {
    const result = await uninstallSkill({
      skill: 'definitely-not-installed',
      agents: ['claude-code'],
    })

    // Should not throw, returns result with no removed entries
    expect(result.removed).toHaveLength(0)
  })
})
