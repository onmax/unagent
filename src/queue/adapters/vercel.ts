import type { QueueCapabilities, QueueSendOptions, QueueSendResult } from '../types/common'
import type { VercelQueueNamespace, VercelQueueSDK } from '../types/vercel'
import { BaseQueueAdapter } from './base'

export class VercelQueueAdapter extends BaseQueueAdapter {
  readonly provider = 'vercel' as const
  readonly supports: QueueCapabilities = { sendBatch: false }

  private topic: string
  private sendFn: VercelQueueSDK['send']
  private sdk: VercelQueueSDK

  constructor(topic: string, sendFn: VercelQueueSDK['send'], sdk: VercelQueueSDK) {
    super()
    this.topic = topic
    this.sendFn = sendFn
    this.sdk = sdk
  }

  async send<T = unknown>(payload: T, options: QueueSendOptions = {}): Promise<QueueSendResult> {
    const { contentType: _contentType, ...vercelOptions } = options
    const { messageId } = await this.sendFn(this.topic, payload, vercelOptions)
    return { messageId }
  }

  override get vercel(): VercelQueueNamespace {
    return { topic: this.topic, native: this.sdk }
  }
}
