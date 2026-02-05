import type { WorkflowResultOptions } from './common'

export interface OpenWorkflowRunRecord {
  id: string
  status?: string
  state?: string
  [key: string]: unknown
}

export interface OpenWorkflowRunLike {
  workflowRun: OpenWorkflowRunRecord
  result: ((options?: WorkflowResultOptions) => Promise<unknown>) | Promise<unknown>
  cancel: () => Promise<void>
  [key: string]: unknown
}

export interface OpenWorkflowWorkflowLike {
  run: (payload?: unknown, options?: Record<string, unknown>) => Promise<OpenWorkflowRunLike>
}

export interface OpenWorkflowProviderOptions {
  name: 'openworkflow'
  workflow: OpenWorkflowWorkflowLike
  ow?: unknown
  getRun?: (id: string) => Promise<OpenWorkflowRunLike | null>
}

export interface OpenWorkflowNamespace {
  readonly workflow: OpenWorkflowWorkflowLike
  readonly ow?: unknown
}
