import { describe, expect, it } from 'vitest'
import { agents, detectInstalledAgents, getAgentConfig, getAgentIds, getXDGPaths, isCI } from '../src/env'

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

  it('isCI returns boolean', () => {
    expect(typeof isCI()).toBe('boolean')
  })
})

describe('env/detect', () => {
  it('detectInstalledAgents returns array', () => {
    const detected = detectInstalledAgents()
    expect(Array.isArray(detected)).toBe(true)
  })
})
