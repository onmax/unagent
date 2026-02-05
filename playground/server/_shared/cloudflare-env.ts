import type { CloudflareQueueBindingLike } from 'unagent/queue'
import type { DurableObjectNamespaceLike } from 'unagent/sandbox'
import type { VectorizeIndexBinding } from 'unagent/vector'
import type { CloudflareWorkflowBindingLike } from 'unagent/workflow'

export interface CloudflareEnv {
  SANDBOX: DurableObjectNamespaceLike
  MY_WORKFLOW: CloudflareWorkflowBindingLike
  MY_QUEUE: CloudflareQueueBindingLike
  VECTORIZE: VectorizeIndexBinding
}
