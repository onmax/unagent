import type { CloudflareQueueNamespace } from '../types/cloudflare'
import type { QueueBatchMessage, QueueCapabilities, QueueProvider, QueueSendBatchOptions, QueueSendOptions, QueueSendResult } from '../types/common'
import type { QueueClient } from '../types/index'
import type { MemoryQueueNamespace } from '../types/memory'
import type { QStashQueueNamespace } from '../types/qstash'
import type { VercelQueueNamespace } from '../types/vercel'
import { NotSupportedError } from '../errors'

export abstract class BaseQueueAdapter implements QueueClient {
  abstract readonly provider: QueueProvider
  abstract readonly supports: QueueCapabilities

  abstract send<T = unknown>(payload: T, options?: QueueSendOptions): Promise<QueueSendResult>

  async sendBatch(_messages: QueueBatchMessage[], _options?: QueueSendBatchOptions): Promise<void> {
    throw new NotSupportedError('sendBatch', this.provider)
  }

  get vercel(): VercelQueueNamespace {
    throw new NotSupportedError('vercel namespace', this.provider)
  }

  get cloudflare(): CloudflareQueueNamespace {
    throw new NotSupportedError('cloudflare namespace', this.provider)
  }

  get qstash(): QStashQueueNamespace {
    throw new NotSupportedError('qstash namespace', this.provider)
  }

  get memory(): MemoryQueueNamespace {
    throw new NotSupportedError('memory namespace', this.provider)
  }
}
