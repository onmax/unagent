import type { CloudflareQueueBindingLike, CloudflareQueueNamespace } from '../types/cloudflare'
import type { QueueBatchMessage, QueueCapabilities, QueueSendBatchOptions, QueueSendOptions, QueueSendResult } from '../types/common'
import { BaseQueueAdapter } from './base'

export class CloudflareQueueAdapter extends BaseQueueAdapter {
  readonly provider = 'cloudflare' as const
  readonly supports: QueueCapabilities = { sendBatch: true }

  private binding: CloudflareQueueBindingLike

  constructor(binding: CloudflareQueueBindingLike) {
    super()
    this.binding = binding
  }

  async send<T = unknown>(payload: T, options: QueueSendOptions<T> = {}): Promise<QueueSendResult> {
    const { contentType } = options
    await this.binding.send(payload, contentType ? { contentType } : undefined)
    return {}
  }

  override async sendBatch(messages: QueueBatchMessage[], options: QueueSendBatchOptions = {}): Promise<void> {
    const { delaySeconds } = options
    await this.binding.sendBatch(messages, delaySeconds !== undefined ? { delaySeconds } : undefined)
  }

  override get cloudflare(): CloudflareQueueNamespace {
    return { binding: this.binding }
  }
}
