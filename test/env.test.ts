import { mkdirSync } from 'node:fs'
import { join } from 'pathe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { agents, detectInstalledAgents, expandPath, getAgentConfig, getAgentIds, getAgentSkillsDirs, getXDGPaths } from '../src/env'
import { useAgentHome } from './helpers/agent-home'

const getAgentHome = useAgentHome()

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

  it('getAgentIds includes supported agent ids', () => {
    const ids = getAgentIds()
    expect(ids).toContain('claude-code')
    expect(ids).toContain('cursor')
    expect(ids).toContain('windsurf')
  })
})

describe('env/paths', () => {
  beforeEach(() => {
    for (const key of ['XDG_DATA_HOME', 'XDG_CONFIG_HOME', 'XDG_CACHE_HOME', 'XDG_STATE_HOME'])
      vi.stubEnv(key, undefined)
  })

  it('getXDGPaths defaults to paths under the home directory', () => {
    const directory = getAgentHome()
    expect(getXDGPaths()).toEqual({
      data: join(directory, '.local/share'),
      config: join(directory, '.config'),
      cache: join(directory, '.cache'),
      state: join(directory, '.local/state'),
    })
  })

  it('getXDGPaths respects each XDG environment override', () => {
    const directory = getAgentHome()
    vi.stubEnv('XDG_DATA_HOME', join(directory, 'data'))
    vi.stubEnv('XDG_CONFIG_HOME', join(directory, 'config'))
    vi.stubEnv('XDG_CACHE_HOME', join(directory, 'cache'))
    vi.stubEnv('XDG_STATE_HOME', join(directory, 'state'))

    expect(getXDGPaths()).toEqual({
      data: join(directory, 'data'),
      config: join(directory, 'config'),
      cache: join(directory, 'cache'),
      state: join(directory, 'state'),
    })
  })

  it('getAgentSkillsDirs prefers skills then legacy .agents/skills', () => {
    const config = getAgentConfig('claude-code')!
    const dirs = getAgentSkillsDirs(config).map(d => d.replace(/\\/g, '/'))
    expect(dirs.length).toBeGreaterThanOrEqual(2)
    expect(dirs[0].endsWith('/.claude/skills')).toBe(true)
    expect(dirs[1].endsWith('/.claude/.agents/skills')).toBe(true)
  })

  it('expandPath expands ~', () => {
    expect(expandPath('~/test')).toBe(join(getAgentHome(), 'test'))
  })
})

describe('env/detect', () => {
  it.each([
    { detected: 'none', env: false, config: false },
    { detected: 'env', env: true, config: false },
    { detected: 'config', env: false, config: true },
    { detected: 'both', env: true, config: true },
  ])('detectInstalledAgents reports $detected detection', ({ detected, env, config }) => {
    if (env)
      vi.stubEnv('CLAUDECODE', '1')
    if (config)
      mkdirSync(join(getAgentHome(), '.claude'))

    expect(detectInstalledAgents().map(({ id, detected }) => ({ id, detected }))).toEqual(
      detected === 'none' ? [] : [{ id: 'claude-code', detected }],
    )
  })
})
