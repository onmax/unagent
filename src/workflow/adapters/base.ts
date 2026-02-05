import type { CloudflareWorkflowNamespace } from '../types/cloudflare'
import type { WorkflowBatchItem, WorkflowCapabilities, WorkflowClient, WorkflowProvider, WorkflowRun, WorkflowStartOptions } from '../types/common'
import type { OpenWorkflowNamespace } from '../types/openworkflow'
import type { VercelWorkflowNamespace } from '../types/vercel'
import { NotSupportedError } from '../errors'

export abstract class BaseWorkflowAdapter implements WorkflowClient {
  abstract readonly provider: WorkflowProvider
  abstract readonly supports: WorkflowCapabilities

  abstract start(payload?: unknown, options?: WorkflowStartOptions): Promise<WorkflowRun>
  abstract get(id: string): Promise<WorkflowRun | null>

  async startBatch(_items: WorkflowBatchItem[]): Promise<WorkflowRun[]> {
    throw new NotSupportedError('startBatch', this.provider)
  }

  get vercel(): VercelWorkflowNamespace {
    throw new NotSupportedError('vercel namespace', this.provider)
  }

  get cloudflare(): CloudflareWorkflowNamespace {
    throw new NotSupportedError('cloudflare namespace', this.provider)
  }

  get openworkflow(): OpenWorkflowNamespace {
    throw new NotSupportedError('openworkflow namespace', this.provider)
  }
}
