import { describe, expect, it } from 'vitest'
import { createRegistry, defineProvider } from '../src/registry'

describe('registry', () => {
  it('creates empty registry', () => {
    const registry = createRegistry<string>()
    expect(registry.list()).toEqual([])
  })

  it('registers and resolves provider', async () => {
    const registry = createRegistry<string, { type: string }>()

    registry.register({
      id: 'test',
      match: input => input.type === 'test',
      resolve: () => 'test-result',
    })

    const result = await registry.resolve({ type: 'test' })
    expect(result).toBe('test-result')
  })

  it('returns undefined when no match', async () => {
    const registry = createRegistry<string, { type: string }>()

    registry.register({
      id: 'test',
      match: input => input.type === 'test',
      resolve: () => 'test-result',
    })

    const result = await registry.resolve({ type: 'other' })
    expect(result).toBeUndefined()
  })

  it('resolves by priority order', async () => {
    const registry = createRegistry<string, { type: string }>()

    registry.register({ id: 'low', match: () => true, resolve: () => 'low', priority: 10 })
    registry.register({ id: 'high', match: () => true, resolve: () => 'high', priority: 100 })
    registry.register({ id: 'medium', match: () => true, resolve: () => 'medium', priority: 50 })

    const result = await registry.resolve({ type: 'any' })
    expect(result).toBe('high')
  })

  it('unregisters provider', async () => {
    const registry = createRegistry<string, { type: string }>()

    registry.register({ id: 'test', match: () => true, resolve: () => 'test' })
    expect(registry.unregister('test')).toBe(true)
    expect(registry.list()).toEqual([])
  })

  it('returns false when unregistering non-existent', () => {
    const registry = createRegistry<string>()
    expect(registry.unregister('non-existent')).toBe(false)
  })

  it('lists providers sorted by priority', () => {
    const registry = createRegistry<string>()

    registry.register({ id: 'a', match: () => true, resolve: () => 'a', priority: 10 })
    registry.register({ id: 'b', match: () => true, resolve: () => 'b', priority: 100 })
    registry.register({ id: 'c', match: () => true, resolve: () => 'c', priority: 50 })

    const list = registry.list()
    expect(list.map(p => p.id)).toEqual(['b', 'c', 'a'])
  })

  it('uses default priority from options', async () => {
    const registry = createRegistry<string>({ defaultPriority: 50 })

    registry.register({ id: 'default', match: () => true, resolve: () => 'default' })
    registry.register({ id: 'high', match: () => true, resolve: () => 'high', priority: 100 })

    const result = await registry.resolve({})
    expect(result).toBe('high')

    const list = registry.list()
    expect(list[1].priority).toBe(50)
  })

  it('supports async resolve', async () => {
    const registry = createRegistry<string>()

    registry.register({
      id: 'async',
      match: () => true,
      resolve: async () => {
        await new Promise(r => setTimeout(r, 10))
        return 'async-result'
      },
    })

    const result = await registry.resolve({})
    expect(result).toBe('async-result')
  })

  describe('defineProvider', () => {
    it('returns the provider unchanged', () => {
      const provider = defineProvider({
        id: 'test',
        match: () => true,
        resolve: () => 'result',
      })

      expect(provider.id).toBe('test')
    })
  })
})
