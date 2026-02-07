import type { QueueCapabilities, QueueSendOptions, QueueSendResult } from '../types/common'
import type { VercelQueueMessageHandler, VercelQueueNamespace, VercelQueueReceiveOptions, VercelQueueSDK } from '../types/vercel'
import { QueueError } from '../errors'
import { BaseQueueAdapter } from './base'

export class VercelQueueAdapter extends BaseQueueAdapter {
  readonly provider = 'vercel' as const
  readonly supports: QueueCapabilities = { sendBatch: false }

  private topic: string
  private sdk: VercelQueueSDK

  constructor(topic: string, sdk: VercelQueueSDK) {
    super()
    this.topic = topic
    this.sdk = sdk
  }

  async send<T = unknown>(payload: T, options: QueueSendOptions = {}): Promise<QueueSendResult> {
    const { contentType: _contentType, ...vercelOptions } = options
    if (typeof this.sdk.send !== 'function')
      throw new QueueError('@vercel/queue send export is not available')
    const { messageId } = await this.sdk.send(this.topic, payload, vercelOptions)
    return { messageId }
  }

  override get vercel(): VercelQueueNamespace {
    const sdk = this.sdk
    const topic = this.topic
    return {
      topic,
      native: sdk,
      receive: async <T = unknown>(consumerGroup: string, handler: VercelQueueMessageHandler<T>, options?: VercelQueueReceiveOptions<T>) => {
        if (typeof sdk.receive !== 'function')
          throw new QueueError('@vercel/queue receive export is not available')
        return sdk.receive(topic, consumerGroup, handler, options)
      },
      handleCallback: (consumerGroupHandlers, options) => {
        if (typeof sdk.handleCallback !== 'function')
          throw new QueueError('@vercel/queue handleCallback export is not available')
        return sdk.handleCallback({ [topic]: consumerGroupHandlers }, options)
      },
      parseCallback: async (request: Request) => {
        if (typeof sdk.parseCallback !== 'function')
          throw new QueueError('@vercel/queue parseCallback export is not available')
        return sdk.parseCallback(request)
      },
    }
  }
}
