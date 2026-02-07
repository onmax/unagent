import { describe, expect, it } from 'vitest'

import { createQueue } from '../src/queue'

describe('queue/memory provider', () => {
  it('enqueues and drains messages', async () => {
    const queue = await createQueue({ provider: { name: 'memory' } })

    const r1 = await queue.send({ a: 1 })
    expect(typeof r1.messageId).toBe('string')

    await queue.sendBatch?.([{ body: { a: 2 } }, { body: { a: 3 } }])
    expect(queue.memory.size()).toBe(3)

    const peek = queue.memory.peek(2)
    expect(peek.length).toBe(2)

    const seen: unknown[] = []
    const drained = await queue.memory.drain(async (payload) => {
      seen.push(payload)
    })

    expect(drained).toBe(3)
    expect(queue.memory.size()).toBe(0)
    expect(seen.length).toBe(3)
  })
})
