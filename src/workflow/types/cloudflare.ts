export interface CloudflareWorkflowStatusLike {
  status?: string
  state?: string
  output?: unknown
  error?: unknown
  errors?: unknown
  [key: string]: unknown
}

export interface CloudflareWorkflowInstanceLike {
  id: string
  status: () => Promise<CloudflareWorkflowStatusLike> | CloudflareWorkflowStatusLike
  pause?: () => Promise<void>
  resume?: () => Promise<void>
  restart?: () => Promise<void>
  terminate?: () => Promise<void>
  sendEvent?: (event: unknown) => Promise<void>
}

export interface CloudflareWorkflowBindingLike {
  create: (input?: Record<string, unknown>) => Promise<CloudflareWorkflowInstanceLike>
  createBatch?: (inputs: Array<Record<string, unknown>>) => Promise<CloudflareWorkflowInstanceLike[]>
  get: (id: string) => Promise<CloudflareWorkflowInstanceLike | null>
}

export interface CloudflareWorkflowProviderOptions {
  name: 'cloudflare'
  binding: CloudflareWorkflowBindingLike
}

export interface CloudflareWorkflowNamespace {
  readonly binding: CloudflareWorkflowBindingLike
}
