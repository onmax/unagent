import type { CloudflareWorkflowBindingLike, CloudflareWorkflowInstanceLike, CloudflareWorkflowNamespace, CloudflareWorkflowStatusLike } from '../types/cloudflare'
import type { WorkflowBatchItem, WorkflowCapabilities, WorkflowRun, WorkflowRunState, WorkflowRunStatus, WorkflowStartOptions } from '../types/common'
import { NotSupportedError, WorkflowError } from '../errors'
import { BaseWorkflowAdapter } from './base'

function normalizeCloudflareStatus(state: string): WorkflowRunState {
  switch (state) {
    case 'queued':
      return 'queued'
    case 'running':
      return 'running'
    case 'paused':
      return 'paused'
    case 'waiting':
    case 'waitingforpause':
    case 'waiting_for_pause':
    case 'waiting-for-pause':
      return 'waiting'
    case 'complete':
    case 'completed':
      return 'completed'
    case 'errored':
    case 'error':
    case 'failed':
      return 'failed'
    case 'terminated':
      return 'terminated'
    case 'cancelled':
    case 'canceled':
      return 'cancelled'
    default:
      return 'unknown'
  }
}

function extractStatusValue(raw: CloudflareWorkflowStatusLike | string | undefined): { raw: unknown, state: string } {
  if (typeof raw === 'string') {
    return { raw, state: raw }
  }
  if (raw && typeof raw === 'object') {
    const candidate = raw.status ?? raw.state
    if (typeof candidate === 'string') {
      return { raw, state: candidate }
    }
  }
  return { raw, state: 'unknown' }
}

function buildCreateInput(payload?: unknown, options: WorkflowStartOptions = {}): Record<string, unknown> {
  const input: Record<string, unknown> = { ...options }
  delete input.workflow

  const hasPayload = payload !== undefined
  const hasParams = 'params' in input || 'payload' in input
  if (hasPayload && !hasParams) {
    input.params = payload
  }
  return input
}

function buildBatchInput(item: WorkflowBatchItem): Record<string, unknown> {
  const { payload, ...rest } = item
  const input: Record<string, unknown> = { ...rest }
  const hasParams = 'params' in input || 'payload' in input
  if (payload !== undefined && !hasParams) {
    input.params = payload
  }
  return input
}

class CloudflareWorkflowRunAdapter implements WorkflowRun {
  readonly id: string
  readonly provider = 'cloudflare' as const
  private instance: CloudflareWorkflowInstanceLike

  constructor(instance: CloudflareWorkflowInstanceLike) {
    this.id = instance.id
    this.instance = instance
  }

  async status(): Promise<WorkflowRunStatus> {
    const rawStatus = await this.instance.status()
    const { raw, state } = extractStatusValue(rawStatus)
    const normalized = normalizeCloudflareStatus(state.toLowerCase())
    const result: WorkflowRunStatus = { state: normalized, raw }

    if (rawStatus && typeof rawStatus === 'object') {
      const statusObj = rawStatus as CloudflareWorkflowStatusLike
      if (statusObj.output !== undefined)
        result.output = statusObj.output
      if (statusObj.error !== undefined)
        result.error = statusObj.error
      if (statusObj.errors !== undefined)
        result.error = statusObj.errors
    }

    return result
  }

  async stop(): Promise<void> {
    if (!this.instance.terminate) {
      throw new NotSupportedError('terminate', 'cloudflare')
    }
    await this.instance.terminate()
  }

  async pause(): Promise<void> {
    if (!this.instance.pause) {
      throw new NotSupportedError('pause', 'cloudflare')
    }
    await this.instance.pause()
  }

  async resume(): Promise<void> {
    if (!this.instance.resume) {
      throw new NotSupportedError('resume', 'cloudflare')
    }
    await this.instance.resume()
  }

  async restart(): Promise<void> {
    if (!this.instance.restart) {
      throw new NotSupportedError('restart', 'cloudflare')
    }
    await this.instance.restart()
  }

  async sendEvent(event: unknown): Promise<void> {
    if (!this.instance.sendEvent) {
      throw new NotSupportedError('sendEvent', 'cloudflare')
    }
    await this.instance.sendEvent(event)
  }
}

export class CloudflareWorkflowAdapter extends BaseWorkflowAdapter {
  readonly provider = 'cloudflare' as const
  readonly supports: WorkflowCapabilities = {
    stop: true,
    pause: true,
    resume: true,
    restart: true,
    sendEvent: true,
    startBatch: true,
  }

  private binding: CloudflareWorkflowBindingLike

  constructor(binding: CloudflareWorkflowBindingLike) {
    super()
    this.binding = binding
  }

  async start(payload?: unknown, options: WorkflowStartOptions = {}): Promise<WorkflowRun> {
    const input = buildCreateInput(payload, options)
    const instance = await this.binding.create(input)
    return new CloudflareWorkflowRunAdapter(instance)
  }

  override async startBatch(items: WorkflowBatchItem[]): Promise<WorkflowRun[]> {
    if (!this.binding.createBatch) {
      throw new NotSupportedError('startBatch', 'cloudflare')
    }
    const inputs = items.map(buildBatchInput)
    const instances = await this.binding.createBatch(inputs)
    return instances.map(instance => new CloudflareWorkflowRunAdapter(instance))
  }

  async get(id: string): Promise<WorkflowRun | null> {
    const instance = await this.binding.get(id)
    if (!instance)
      return null
    return new CloudflareWorkflowRunAdapter(instance)
  }

  override get cloudflare(): CloudflareWorkflowNamespace {
    return { binding: this.binding }
  }
}

export function assertCloudflareBinding(binding?: CloudflareWorkflowBindingLike): asserts binding is CloudflareWorkflowBindingLike {
  if (!binding) {
    throw new WorkflowError('Cloudflare workflow binding is required')
  }
}
