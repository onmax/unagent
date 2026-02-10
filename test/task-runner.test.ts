import { describe, expect, it } from 'vitest'
import { createTaskRunner, TaskError } from '../src/task'

function deferred<T = void>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: any) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('task runner', () => {
  it('dedup is stable across payload key order', async () => {
    const gate = deferred<void>()
    let runs = 0

    const runner = createTaskRunner({
      tasks: {
        t: {
          async run() {
            runs++
            await gate.promise
            return { result: runs }
          },
        },
      },
    })

    const p1 = runner.runTask('t', { payload: { a: 1, b: 2 } })
    const p2 = runner.runTask('t', { payload: { b: 2, a: 1 } })

    expect(p1).toBe(p2)

    gate.resolve()
    await Promise.all([p1, p2])
    expect(runs).toBe(1)
  })

  it('dedup key generation does not throw on circular payload', async () => {
    const gate = deferred<void>()
    let runs = 0

    const runner = createTaskRunner({
      tasks: {
        t: {
          async run() {
            runs++
            await gate.promise
            return { result: true }
          },
        },
      },
    })

    const payload: any = {}
    payload.self = payload

    const p = runner.runTask('t', { payload })
    gate.resolve()
    await p
    expect(runs).toBe(1)
  })

  it('dedupeKey overrides computed key', async () => {
    const gate = deferred<void>()
    let runs = 0

    const runner = createTaskRunner({
      tasks: {
        t: {
          async run() {
            runs++
            await gate.promise
            return { result: true }
          },
        },
      },
    })

    const p1 = runner.runTask('t', { payload: { a: 1 }, dedupeKey: 'k' })
    const p2 = runner.runTask('t', { payload: { a: 2 }, dedupeKey: 'k' })

    expect(p1).toBe(p2)

    gate.resolve()
    await Promise.all([p1, p2])
    expect(runs).toBe(1)
  })

  it('dedupe=false disables dedup', async () => {
    const gates = [deferred<void>(), deferred<void>()]
    let i = 0
    let runs = 0

    const runner = createTaskRunner({
      tasks: {
        t: {
          async run() {
            const idx = i++
            runs++
            await gates[idx].promise
            return { result: idx }
          },
        },
      },
    })

    const p1 = runner.runTask('t', { payload: { a: 1 }, dedupe: false })
    const p2 = runner.runTask('t', { payload: { a: 1 }, dedupe: false })

    expect(p1).not.toBe(p2)

    gates[0].resolve()
    gates[1].resolve()
    await Promise.all([p1, p2])
    expect(runs).toBe(2)
  })

  it('dedupeContext=true includes context in key', async () => {
    const gates = [deferred<void>(), deferred<void>()]
    let i = 0
    let runs = 0

    const runner = createTaskRunner({
      tasks: {
        t: {
          async run() {
            const idx = i++
            runs++
            await gates[idx].promise
            return { result: idx }
          },
        },
      },
    })

    const p1 = runner.runTask('t', { payload: { a: 1 }, context: { reqId: 1 }, dedupeContext: true })
    const p2 = runner.runTask('t', { payload: { a: 1 }, context: { reqId: 2 }, dedupeContext: true })

    expect(p1).not.toBe(p2)

    gates[0].resolve()
    gates[1].resolve()
    await Promise.all([p1, p2])
    expect(runs).toBe(2)
  })

  it('runCronTasks missing cron: throw by default, noop when configured', async () => {
    const runner = createTaskRunner({
      tasks: { t: { run: () => ({ result: true }) } },
      scheduledTasks: { '* * * * *': ['t'] },
    })

    expect(() => runner.runCronTasks('missing')).toThrow(TaskError)

    await expect(runner.runCronTasks('missing', { onMissing: 'noop' })).resolves.toEqual([])
  })
})
