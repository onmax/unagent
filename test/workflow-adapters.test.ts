import type { CloudflareWorkflowBindingLike, CloudflareWorkflowInstanceLike } from '../src/workflow/types/cloudflare'
import type { VercelWorkflowAPI, VercelWorkflowRunLike } from '../src/workflow/types/vercel'
import { describe, expect, it, vi } from 'vitest'

import { CloudflareWorkflowAdapter } from '../src/workflow/adapters/cloudflare'
import { VercelWorkflowAdapter } from '../src/workflow/adapters/vercel'

function createVercelRun(overrides: Partial<VercelWorkflowRunLike> = {}): VercelWorkflowRunLike {
  return {
    id: 'run-1',
    status: 'pending',
    cancel: async () => {},
    returnValue: async () => ({ ok: true }),
    ...overrides,
  }
}

function createCloudflareInstance(overrides: Partial<CloudflareWorkflowInstanceLike> = {}): CloudflareWorkflowInstanceLike {
  return {
    id: 'cf-1',
    status: async () => ({ status: 'running' }),
    pause: async () => {},
    resume: async () => {},
    restart: async () => {},
    terminate: async () => {},
    sendEvent: async () => {},
    ...overrides,
  }
}

describe('workflow adapters (vercel)', () => {
  it('starts, gets, and stops a workflow run', async () => {
    const run = createVercelRun({ status: 'running' })
    const api: VercelWorkflowAPI = {
      start: vi.fn(async () => run),
      getRun: vi.fn(async () => run),
    }

    const adapter = new VercelWorkflowAdapter('notify-users', api)

    const started = await adapter.start({ userId: '123' })
    expect(started.provider).toBe('vercel')

    const status = await started.status()
    expect(status.state).toBe('running')

    const fetched = await adapter.get('run-1')
    expect(fetched?.id).toBe('run-1')

    const cancelSpy = vi.fn()
    const stoppable = createVercelRun({ status: 'running', cancel: cancelSpy })
    const adapterStop = new VercelWorkflowAdapter('notify-users', {
      start: async () => stoppable,
      getRun: async () => stoppable,
    })

    const runToStop = await adapterStop.start()
    await runToStop.stop()
    expect(cancelSpy).toHaveBeenCalled()
  })

  it('normalizes completed status and returns output', async () => {
    const run = createVercelRun({
      status: 'completed',
      returnValue: async () => ({ result: 'done' }),
    })
    const adapter = new VercelWorkflowAdapter('notify-users', {
      start: async () => run,
      getRun: async () => run,
    })

    const started = await adapter.start()
    const status = await started.status()
    expect(status.state).toBe('completed')
    expect(status.output).toEqual({ result: 'done' })
  })

  it('throws when startBatch is called', async () => {
    const adapter = new VercelWorkflowAdapter('notify-users', {
      start: async () => createVercelRun(),
      getRun: async () => createVercelRun(),
    })

    await expect(adapter.startBatch([{ payload: { id: 1 } }])).rejects.toThrow()
  })
})

describe('workflow adapters (cloudflare)', () => {
  it('starts, gets, and stops a workflow run', async () => {
    const instance = createCloudflareInstance()
    const binding: CloudflareWorkflowBindingLike = {
      create: vi.fn(async () => instance),
      get: vi.fn(async () => instance),
    }

    const adapter = new CloudflareWorkflowAdapter(binding)
    const started = await adapter.start({ userId: '123' })
    expect(started.provider).toBe('cloudflare')

    const status = await started.status()
    expect(status.state).toBe('running')

    const fetched = await adapter.get('cf-1')
    expect(fetched?.id).toBe('cf-1')

    const terminateSpy = vi.fn(async () => {})
    const stoppable = createCloudflareInstance({ terminate: terminateSpy })
    const adapterStop = new CloudflareWorkflowAdapter({
      create: async () => stoppable,
      get: async () => stoppable,
    })

    const runToStop = await adapterStop.start()
    await runToStop.stop()
    expect(terminateSpy).toHaveBeenCalled()
  })

  it('supports pause/resume/restart/sendEvent and batch start', async () => {
    const instance = createCloudflareInstance({
      status: async () => ({ status: 'paused' }),
    })
    const instance2 = createCloudflareInstance({ id: 'cf-2' })
    const binding: CloudflareWorkflowBindingLike = {
      create: async () => instance,
      createBatch: async () => [instance, instance2],
      get: async () => instance,
    }

    const adapter = new CloudflareWorkflowAdapter(binding)
    const run = await adapter.start({ userId: '123' })

    await run.pause?.()
    await run.resume?.()
    await run.restart?.()
    await run.sendEvent?.({ type: 'ping' })

    const status = await run.status()
    expect(status.state).toBe('paused')

    const batch = await adapter.startBatch([{ payload: { id: 1 } }, { payload: { id: 2 } }])
    expect(batch).toHaveLength(2)
  })

  it('normalizes errored status as failed', async () => {
    const instance = createCloudflareInstance({
      status: async () => ({ status: 'errored', error: 'boom' }),
    })
    const adapter = new CloudflareWorkflowAdapter({
      create: async () => instance,
      get: async () => instance,
    })

    const run = await adapter.start()
    const status = await run.status()
    expect(status.state).toBe('failed')
    expect(status.error).toBe('boom')
  })
})
