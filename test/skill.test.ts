import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { join } from 'pathe'
import { beforeEach, describe, expect, it } from 'vitest'
import { discoverSkills, extractSkillName, filterSkills, installSkill, parseSkillMd, toPromptXml, uninstallSkill, validateSkill, validateSkillMd } from '../src/skill'
import { useAgentHome } from './helpers/agent-home'

const getAgentHome = useAgentHome()

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
  let testDir: string

  beforeEach(() => {
    testDir = getAgentHome()
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
    const skillDir = join(testDir, 'my-skills', 'my-skill')
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
  let sourceDir: string
  let targetDir: string
  const content = `---
name: test-skill
description: A test skill
---
Instructions here`

  beforeEach(() => {
    sourceDir = join(getAgentHome(), 'source')
    targetDir = join(getAgentHome(), 'target')
    mkdirSync(join(sourceDir, 'test-skill'), { recursive: true })
    mkdirSync(targetDir)
    writeFileSync(join(sourceDir, 'test-skill', 'SKILL.md'), content)
  })

  it.each(['absolute', 'relative'])('installs and uninstalls a skill from %s local sources', async (kind) => {
    const source = kind === 'relative' ? '../source' : sourceDir
    const skillsDir = join(getAgentHome(), '.claude', 'skills')
    const path = join(skillsDir, 'test-skill')
    const result = await installSkill({
      source,
      cwd: targetDir,
      skills: ['test-skill'],
      agents: ['claude-code'],
    })

    expect(result).toEqual({ success: true, installed: [{ skill: 'test-skill', agent: 'claude-code', path }], errors: [] })
    expect(lstatSync(path).isSymbolicLink()).toBe(true)
    expect(realpathSync(path)).toBe(realpathSync(join(sourceDir, 'test-skill')))
    expect(readFileSync(join(path, 'SKILL.md'), 'utf8')).toBe(content)
    expect(JSON.parse(readFileSync(join(skillsDir, 'skill.lock'), 'utf8'))).toMatchObject({
      version: 1,
      skills: { 'test-skill': { name: 'test-skill', source, hash: expect.stringMatching(/^[a-f0-9]{16}$/) } },
    })

    expect(await uninstallSkill({ skill: 'test-skill', agents: ['claude-code'] })).toEqual({
      success: true,
      removed: [{ skill: 'test-skill', agent: 'claude-code', path }],
      errors: [],
    })
    expect(existsSync(path)).toBe(false)
    expect(readFileSync(join(sourceDir, 'test-skill', 'SKILL.md'), 'utf8')).toBe(content)
    expect(JSON.parse(readFileSync(join(skillsDir, 'skill.lock'), 'utf8'))).toEqual({ version: 1, skills: {} })
  })

  it('returns error for non-existent skill', async () => {
    const result = await installSkill({
      source: sourceDir,
      skills: ['non-existent'],
      agents: ['claude-code'],
    })

    expect(result).toEqual({
      success: false,
      installed: [],
      errors: [{ skill: 'non-existent', agent: '*', error: 'Skill not found in source' }],
    })
  })

  it('returns error for empty source', async () => {
    const result = await installSkill({ source: targetDir, agents: ['claude-code'] })

    expect(result).toEqual({
      success: false,
      installed: [],
      errors: [{ skill: '*', agent: '*', error: 'No skills found in source' }],
    })
  })
})

describe('skill/uninstall', () => {
  it('returns error when no agents specified and none detected', async () => {
    expect(await uninstallSkill({ skill: 'non-existent', agents: [] })).toEqual({
      success: false,
      removed: [],
      errors: [{ skill: 'non-existent', agent: '*', error: 'No agents found or specified' }],
    })
  })

  it('handles non-existent skill gracefully', async () => {
    expect(await uninstallSkill({ skill: 'definitely-not-installed', agents: ['claude-code'] })).toEqual({
      success: false,
      removed: [],
      errors: [],
    })
  })
})
