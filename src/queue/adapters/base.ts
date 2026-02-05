import type { CloudflareQueueNamespace } from '../types/cloudflare'
import type { QueueBatchMessage, QueueCapabilities, QueueProvider, QueueSendBatchOptions, QueueSendOptions, QueueSendResult } from '../types/common'
import type { QueueClient } from '../types/index'
import type { VercelQueueNamespace } from '../types/vercel'
import { NotSupportedError } from '../errors'

export abstract class BaseQueueAdapter implements QueueClient {
  abstract readonly provider: QueueProvider
  abstract readonly supports: QueueCapabilities

  abstract send<T = unknown>(payload: T, options?: QueueSendOptions<T>): Promise<QueueSendResult>

  async sendBatch(_messages: QueueBatchMessage[], _options?: QueueSendBatchOptions): Promise<void> {
    throw new NotSupportedError('sendBatch', this.provider)
  }

  get vercel(): VercelQueueNamespace {
    throw new NotSupportedError('vercel namespace', this.provider)
  }

  get cloudflare(): CloudflareQueueNamespace {
    throw new NotSupportedError('cloudflare namespace', this.provider)
  }
}
