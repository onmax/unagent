import type { WorkflowBatchItem, WorkflowCapabilities, WorkflowResultOptions, WorkflowRun, WorkflowRunState, WorkflowRunStatus, WorkflowStartOptions } from '../types/common'
import type { OpenWorkflowNamespace, OpenWorkflowProviderOptions, OpenWorkflowRunLike, OpenWorkflowWorkflowLike } from '../types/openworkflow'
import { WorkflowError } from '../errors'
import { BaseWorkflowAdapter } from './base'

function normalizeOpenWorkflowStatus(state: string): WorkflowRunState {
  switch (state) {
    case 'pending':
    case 'queued':
      return 'queued'
    case 'running':
      return 'running'
    case 'sleeping':
      return 'waiting'
    case 'succeeded':
    case 'completed':
      return 'completed'
    case 'failed':
      return 'failed'
    case 'canceled':
    case 'cancelled':
      return 'cancelled'
    default:
      return 'unknown'
  }
}

function extractStatusValue(raw: unknown): { raw: unknown, state: string } {
  if (typeof raw === 'string')
    return { raw, state: raw }
  if (raw && typeof raw === 'object') {
    const candidate = (raw as { status?: unknown, state?: unknown }).status
      ?? (raw as { state?: unknown }).state
    if (typeof candidate === 'string')
      return { raw, state: candidate }
  }
  return { raw, state: 'unknown' }
}

async function readRunStatus(run: OpenWorkflowRunLike, getLatest?: (id: string) => Promise<unknown>): Promise<{ raw: unknown, state: string }> {
  if (getLatest) {
    try {
      const latest = await getLatest(run.workflowRun?.id ?? '')
      if (latest)
        return extractStatusValue(latest)
    }
    catch {
      // Fall back to initial run data
    }
  }
  return extractStatusValue(run.workflowRun)
}

function buildBatchOptions(item: WorkflowBatchItem): Record<string, unknown> {
  const { payload, ...rest } = item
  return { ...rest }
}

class OpenWorkflowRunAdapter implements WorkflowRun {
  readonly id: string
  readonly provider = 'openworkflow' as const
  private run: OpenWorkflowRunLike
  private getLatest?: (id: string) => Promise<unknown>

  constructor(run: OpenWorkflowRunLike, getLatest?: (id: string) => Promise<unknown>) {
    this.id = run.workflowRun?.id ?? ''
    this.run = run
    this.getLatest = getLatest
  }

  async status(): Promise<WorkflowRunStatus> {
    const { raw, state } = await readRunStatus(this.run, this.getLatest)
    const normalized = normalizeOpenWorkflowStatus(state.toLowerCase())
    const result: WorkflowRunStatus = { state: normalized, raw }

    if (raw && typeof raw === 'object') {
      if ('error' in raw)
        result.error = (raw as { error?: unknown }).error
      if ('errors' in raw)
        result.error = (raw as { errors?: unknown }).errors
      if (normalized === 'completed' && 'output' in raw)
        result.output = (raw as { output?: unknown }).output
    }

    if (normalized === 'completed') {
      try {
        if (result.output === undefined) {
          const value = typeof this.run.result === 'function'
            ? await this.run.result()
            : await this.run.result
          result.output = value
        }
      }
      catch {
        // Ignore result errors
      }
    }

    return result
  }

  async result(options?: WorkflowResultOptions): Promise<unknown> {
    if (!this.run.result)
      throw new WorkflowError('OpenWorkflow result is not available')
    if (typeof this.run.result === 'function')
      return await this.run.result(options)
    return await this.run.result
  }

  async stop(): Promise<void> {
    await this.run.cancel()
  }
}

export class OpenWorkflowAdapter extends BaseWorkflowAdapter {
  readonly provider = 'openworkflow' as const
  readonly supports: WorkflowCapabilities = {
    stop: true,
    pause: false,
    resume: false,
    restart: false,
    sendEvent: false,
    startBatch: true,
  }

  private workflowDefinition: OpenWorkflowWorkflowLike
  private ow?: OpenWorkflowProviderOptions['ow']
  private getRun?: OpenWorkflowProviderOptions['getRun']
  private getLatest?: (id: string) => Promise<unknown>

  constructor(workflowDefinition: OpenWorkflowWorkflowLike, provider: Omit<OpenWorkflowProviderOptions, 'name' | 'workflow'> = {}) {
    super()
    this.workflowDefinition = workflowDefinition
    this.ow = provider.ow
    this.getRun = provider.getRun
    if (this.ow && typeof (this.ow as { backend?: { getWorkflowRun?: (params: { workflowRunId: string }) => Promise<unknown> } }).backend?.getWorkflowRun === 'function') {
      this.getLatest = async (id: string) => {
        return (this.ow as { backend: { getWorkflowRun: (params: { workflowRunId: string }) => Promise<unknown> } }).backend.getWorkflowRun({ workflowRunId: id })
      }
    }
  }

  async start(payload?: unknown, options: WorkflowStartOptions = {}): Promise<WorkflowRun> {
    const { workflow, ...rest } = options
    const definition = (workflow as OpenWorkflowWorkflowLike | undefined) ?? this.workflowDefinition
    if (!definition)
      throw new WorkflowError('OpenWorkflow workflow definition is required')

    const hasOptions = Object.keys(rest).length > 0
    const run = payload === undefined
      ? hasOptions
        ? await definition.run(undefined, rest)
        : await definition.run()
      : hasOptions
        ? await definition.run(payload, rest)
        : await definition.run(payload)

    return new OpenWorkflowRunAdapter(run, this.getLatest)
  }

  override async startBatch(items: WorkflowBatchItem[]): Promise<WorkflowRun[]> {
    const runs = await Promise.all(items.map((item) => {
      const options = buildBatchOptions(item)
      return this.start(item.payload, options)
    }))
    return runs
  }

  async get(id: string): Promise<WorkflowRun | null> {
    if (!this.getRun)
      return null
    const run = await this.getRun(id)
    if (!run)
      return null
    return new OpenWorkflowRunAdapter(run, this.getLatest)
  }

  override get openworkflow(): OpenWorkflowNamespace {
    return { workflow: this.workflowDefinition, ow: this.ow }
  }
}
