export type VercelWorkflowDefinition = unknown

export interface VercelWorkflowRunLike {
  runId?: string
  id?: string
  status: string | Promise<string> | (() => Promise<string | { status?: string, state?: string, [key: string]: unknown }>)
  cancel: () => Promise<void>
  returnValue?: Promise<unknown> | (() => Promise<unknown>)
  [key: string]: unknown
}

export interface VercelWorkflowStartOptions {
  workflow?: VercelWorkflowDefinition
  [key: string]: unknown
}

export interface VercelWorkflowAPI {
  start: (workflow: VercelWorkflowDefinition, argsOrOptions?: unknown, options?: Record<string, unknown>) => Promise<VercelWorkflowRunLike>
  getRun: (id: string) => Promise<VercelWorkflowRunLike | null>
}

export interface VercelWorkflowProviderOptions {
  name: 'vercel'
  workflow: VercelWorkflowDefinition
}

export interface VercelWorkflowNamespace {
  readonly api: VercelWorkflowAPI
  readonly workflow: VercelWorkflowDefinition
}
