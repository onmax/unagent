import { homedir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { agents, detectInstalledAgents, expandPath, getAgentConfig, getAgentIds, getAgentSkillsDirs, getXDGPaths, isCI } from '../src/env'

describe('env/agents', () => {
  it('has 40+ agent configs', () => {
    expect(Object.keys(agents).length).toBeGreaterThan(40)
  })

  it('getAgentConfig returns config for known agent', () => {
    const config = getAgentConfig('claude-code')
    expect(config).toBeDefined()
    expect(config?.name).toBe('Claude Code')
    expect(config?.configDir).toBe('~/.claude')
  })

  it('getAgentConfig returns undefined for unknown agent', () => {
    expect(getAgentConfig('nonexistent')).toBeUndefined()
  })

  it('getAgentIds returns all agent ids', () => {
    const ids = getAgentIds()
    expect(ids).toContain('claude-code')
    expect(ids).toContain('cursor')
    expect(ids).toContain('windsurf')
  })
})

describe('env/paths', () => {
  it('getXDGPaths returns valid paths', () => {
    const paths = getXDGPaths()
    expect(paths.data).toBeDefined()
    expect(paths.config).toBeDefined()
    expect(paths.cache).toBeDefined()
    expect(paths.state).toBeDefined()
  })

  it('getAgentSkillsDirs prefers skills then legacy .agents/skills', () => {
    const config = getAgentConfig('claude-code')!
    const dirs = getAgentSkillsDirs(config).map(d => d.replace(/\\/g, '/'))
    expect(dirs.length).toBeGreaterThanOrEqual(2)
    expect(dirs[0].endsWith('/.claude/skills')).toBe(true)
    expect(dirs[1].endsWith('/.claude/.agents/skills')).toBe(true)
  })

  it('expandPath expands ~', () => {
    const home = homedir().replace(/\\/g, '/')
    expect(expandPath('~/test').replace(/\\/g, '/')).toBe(`${home}/test`)
  })

  it('isCI is a boolean', () => {
    expect(typeof isCI).toBe('boolean')
  })
})

describe('env/detect', () => {
  it('detectInstalledAgents returns array', () => {
    const detected = detectInstalledAgents()
    expect(Array.isArray(detected)).toBe(true)
  })
})
