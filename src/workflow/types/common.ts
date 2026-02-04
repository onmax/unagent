import type { CloudflareWorkflowProviderOptions } from './cloudflare'
import type { VercelWorkflowProviderOptions } from './vercel'

export type WorkflowProvider = 'vercel' | 'cloudflare'

export type WorkflowRunState = 'queued' | 'running' | 'paused' | 'waiting' | 'completed' | 'failed' | 'cancelled' | 'terminated' | 'unknown'

export interface WorkflowRunStatus {
  state: WorkflowRunState
  raw: unknown
  output?: unknown
  error?: unknown
}

export interface WorkflowCapabilities {
  stop: boolean
  pause: boolean
  resume: boolean
  restart: boolean
  sendEvent: boolean
  startBatch: boolean
}

export interface WorkflowRun {
  readonly id: string
  readonly provider: WorkflowProvider
  status: () => Promise<WorkflowRunStatus>
  stop: () => Promise<void>
  pause?: () => Promise<void>
  resume?: () => Promise<void>
  restart?: () => Promise<void>
  sendEvent?: (event: unknown) => Promise<void>
}

export interface WorkflowStartOptions {
  workflow?: unknown
  [key: string]: unknown
}

export interface WorkflowBatchItem {
  payload?: unknown
  [key: string]: unknown
}

export interface WorkflowClient {
  readonly provider: WorkflowProvider
  readonly supports: WorkflowCapabilities
  start: (payload?: unknown, options?: WorkflowStartOptions) => Promise<WorkflowRun>
  get: (id: string) => Promise<WorkflowRun | null>
  startBatch?: (items: WorkflowBatchItem[]) => Promise<WorkflowRun[]>
}

export type WorkflowProviderOptions = VercelWorkflowProviderOptions | CloudflareWorkflowProviderOptions

export interface WorkflowOptions {
  provider?: WorkflowProviderOptions
}

export interface WorkflowDetectionResult {
  type: WorkflowProvider | 'none'
  details?: Record<string, unknown>
}
