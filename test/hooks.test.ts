import { describe, expect, it, vi } from 'vitest'
import { createAgentHooks } from '../src/hooks'

describe('hooks', () => {
  it('creates hooks instance', () => {
    const hooks = createAgentHooks()
    expect(hooks).toBeDefined()
    expect(hooks.hook).toBeTypeOf('function')
    expect(hooks.callHook).toBeTypeOf('function')
  })

  it('registers and calls tool:before hook', async () => {
    const hooks = createAgentHooks()
    const handler = vi.fn()
    hooks.hook('tool:before', handler)

    await hooks.callHook('tool:before', { name: 'readFile', args: { path: '/test' } })

    expect(handler).toHaveBeenCalledWith({ name: 'readFile', args: { path: '/test' } })
  })

  it('registers and calls tool:after hook', async () => {
    const hooks = createAgentHooks()
    const handler = vi.fn()
    hooks.hook('tool:after', handler)

    await hooks.callHook('tool:after', { name: 'readFile', args: { path: '/test' }, result: 'content' })

    expect(handler).toHaveBeenCalledWith({ name: 'readFile', args: { path: '/test' }, result: 'content' })
  })

  it('registers and calls tool:error hook', async () => {
    const hooks = createAgentHooks()
    const handler = vi.fn()
    hooks.hook('tool:error', handler)

    const error = new Error('test error')
    await hooks.callHook('tool:error', { name: 'readFile', error })

    expect(handler).toHaveBeenCalledWith({ name: 'readFile', error })
  })

  it('registers and calls llm:before hook', async () => {
    const hooks = createAgentHooks()
    const handler = vi.fn()
    hooks.hook('llm:before', handler)

    const messages = [{ role: 'user', content: 'hello' }]
    await hooks.callHook('llm:before', { messages })

    expect(handler).toHaveBeenCalledWith({ messages })
  })

  it('registers and calls llm:after hook', async () => {
    const hooks = createAgentHooks()
    const handler = vi.fn()
    hooks.hook('llm:after', handler)

    const response = { text: 'hello' }
    const usage = { inputTokens: 10, outputTokens: 5 }
    await hooks.callHook('llm:after', { response, usage })

    expect(handler).toHaveBeenCalledWith({ response, usage })
  })

  it('registers and calls iteration hooks', async () => {
    const hooks = createAgentHooks()
    const startHandler = vi.fn()
    const endHandler = vi.fn()

    hooks.hook('iteration:start', startHandler)
    hooks.hook('iteration:end', endHandler)

    await hooks.callHook('iteration:start', { iteration: 1 })
    await hooks.callHook('iteration:end', { iteration: 1 })

    expect(startHandler).toHaveBeenCalledWith({ iteration: 1 })
    expect(endHandler).toHaveBeenCalledWith({ iteration: 1 })
  })

  it('supports async hooks', async () => {
    const hooks = createAgentHooks()
    const results: number[] = []

    hooks.hook('tool:before', async () => {
      await new Promise(r => setTimeout(r, 10))
      results.push(1)
    })

    await hooks.callHook('tool:before', { name: 'test', args: {} })

    expect(results).toEqual([1])
  })

  it('calls multiple handlers in order', async () => {
    const hooks = createAgentHooks()
    const results: number[] = []

    hooks.hook('tool:before', () => results.push(1))
    hooks.hook('tool:before', () => results.push(2))

    await hooks.callHook('tool:before', { name: 'test', args: {} })

    expect(results).toEqual([1, 2])
  })
})
