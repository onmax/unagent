import type { WorkflowCapabilities, WorkflowRun, WorkflowRunState, WorkflowRunStatus, WorkflowStartOptions } from '../types/common'
import type { VercelWorkflowAPI, VercelWorkflowDefinition, VercelWorkflowNamespace, VercelWorkflowRunLike } from '../types/vercel'
import { WorkflowError } from '../errors'
import { BaseWorkflowAdapter } from './base'

function normalizeVercelStatus(state: string): WorkflowRunState {
  switch (state) {
    case 'pending':
      return 'queued'
    case 'running':
      return 'running'
    case 'completed':
      return 'completed'
    case 'failed':
      return 'failed'
    case 'cancelled':
    case 'canceled':
      return 'cancelled'
    default:
      return 'unknown'
  }
}

function extractStatusValue(raw: unknown): { raw: unknown, state: string } {
  if (typeof raw === 'string') {
    return { raw, state: raw }
  }
  if (raw && typeof raw === 'object') {
    const candidate = (raw as { status?: unknown, state?: unknown }).status
      ?? (raw as { state?: unknown }).state
    if (typeof candidate === 'string') {
      return { raw, state: candidate }
    }
  }
  return { raw, state: 'unknown' }
}

async function readRunStatus(run: VercelWorkflowRunLike): Promise<{ raw: unknown, state: string }> {
  const statusValue = typeof run.status === 'function' ? await run.status() : await Promise.resolve(run.status)
  return extractStatusValue(statusValue)
}

class VercelWorkflowRunAdapter implements WorkflowRun {
  readonly id: string
  readonly provider = 'vercel' as const
  private run: VercelWorkflowRunLike

  constructor(run: VercelWorkflowRunLike) {
    this.id = run.runId ?? run.id ?? ''
    this.run = run
  }

  async status(): Promise<WorkflowRunStatus> {
    const { raw, state } = await readRunStatus(this.run)
    const normalized = normalizeVercelStatus(state)
    const result: WorkflowRunStatus = { state: normalized, raw }

    if (raw && typeof raw === 'object' && 'error' in raw) {
      result.error = (raw as { error?: unknown }).error
    }

    if (normalized === 'completed' && this.run.returnValue !== undefined) {
      try {
        const value = typeof this.run.returnValue === 'function'
          ? await this.run.returnValue()
          : await this.run.returnValue
        result.output = value
      }
      catch {
        // Ignore returnValue errors
      }
    }

    return result
  }

  async stop(): Promise<void> {
    await this.run.cancel()
  }
}

export class VercelWorkflowAdapter extends BaseWorkflowAdapter {
  readonly provider = 'vercel' as const
  readonly supports: WorkflowCapabilities = {
    stop: true,
    pause: false,
    resume: false,
    restart: false,
    sendEvent: false,
    startBatch: false,
  }

  private api: VercelWorkflowAPI
  private workflowDefinition: VercelWorkflowDefinition

  constructor(workflowDefinition: VercelWorkflowDefinition, api: VercelWorkflowAPI) {
    super()
    this.workflowDefinition = workflowDefinition
    this.api = api
  }

  async start(payload?: unknown, options: WorkflowStartOptions = {}): Promise<WorkflowRun> {
    const { workflow, ...rest } = options
    const definition = (workflow as VercelWorkflowDefinition | undefined) ?? this.workflowDefinition
    if (!definition) {
      throw new WorkflowError('Vercel workflow definition is required')
    }
    const hasOptions = Object.keys(rest).length > 0
    const run = payload === undefined
      ? hasOptions
        ? await this.api.start(definition, undefined, rest)
        : await this.api.start(definition)
      : hasOptions
        ? await this.api.start(definition, payload, rest)
        : await this.api.start(definition, payload)
    return new VercelWorkflowRunAdapter(run)
  }

  async get(id: string): Promise<WorkflowRun | null> {
    const run = await this.api.getRun(id)
    if (!run)
      return null
    return new VercelWorkflowRunAdapter(run)
  }

  override get vercel(): VercelWorkflowNamespace {
    return { api: this.api, workflow: this.workflowDefinition }
  }
}
