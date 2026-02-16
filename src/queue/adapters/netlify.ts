import type { NetlifyAsyncWorkloadsClient, NetlifySdk, NetlifySendEventResult } from '../../_internal/netlify-types'
import type { QueueCapabilities, QueueSendOptions, QueueSendResult } from '../types/common'
import type { NetlifyQueueNamespace, NetlifyQueueProviderOptions, NetlifyQueueSendOptions, NetlifyQueueSendResult } from '../types/netlify'
import { assertNetlifySendSucceeded, toNetlifyDelayUntil } from '../../_internal/netlify-send'
import { QueueError } from '../errors'
import { BaseQueueAdapter } from './base'

function createNetlifySendFailedError(eventName: string, response: NetlifySendEventResult): QueueError {
  return new QueueError(`@netlify/async-workloads AsyncWorkloadsClient.send failed for event "${eventName}"`, {
    code: 'NETLIFY_SEND_FAILED',
    provider: 'netlify',
    upstreamError: response,
    details: {
      eventId: response.eventId,
      eventName,
      sendStatus: response.sendStatus,
    },
  })
}

export class NetlifyQueueAdapter extends BaseQueueAdapter {
  readonly provider = 'netlify' as const
  readonly supports: QueueCapabilities = { sendBatch: false }

  private event: string
  private sdk: NetlifySdk
  private client: NetlifyAsyncWorkloadsClient | NonNullable<NetlifyQueueProviderOptions['client']>

  constructor(provider: NetlifyQueueProviderOptions, sdk: NetlifySdk) {
    super()
    this.event = provider.event
    this.sdk = sdk
    this.client = provider.client || new sdk.AsyncWorkloadsClient({
      ...(provider.baseUrl ? { baseUrl: provider.baseUrl } : {}),
      ...(provider.apiKey ? { apiKey: provider.apiKey } : {}),
    })
  }

  async send<T = unknown>(payload: T, options: QueueSendOptions = {}): Promise<QueueSendResult> {
    if (!this.client || typeof this.client.send !== 'function')
      throw new QueueError('@netlify/async-workloads AsyncWorkloadsClient.send is not available')

    const delayUntil = toNetlifyDelayUntil(options)
    const response = await this.client.send(this.event, {
      data: payload,
      ...(delayUntil !== undefined ? { delayUntil } : {}),
      ...(options.priority !== undefined ? { priority: options.priority } : {}),
    })
    assertNetlifySendSucceeded(this.event, response, createNetlifySendFailedError)

    return { messageId: response.eventId, sendStatus: response.sendStatus }
  }

  override get netlify(): NetlifyQueueNamespace {
    const client = this.client
    const sdk = this.sdk
    return {
      event: this.event,
      native: client,
      send: async (eventName: string, options: NetlifyQueueSendOptions = {}): Promise<NetlifyQueueSendResult> => {
        if (typeof client.send !== 'function')
          throw new QueueError('@netlify/async-workloads AsyncWorkloadsClient.send is not available')

        const delayUntil = toNetlifyDelayUntil(options)
        const response = await client.send(eventName, {
          ...(options.data !== undefined ? { data: options.data } : {}),
          ...(delayUntil !== undefined ? { delayUntil } : {}),
          ...(options.priority !== undefined ? { priority: options.priority } : {}),
        })
        assertNetlifySendSucceeded(eventName, response, createNetlifySendFailedError)

        return { messageId: response.eventId, sendStatus: response.sendStatus }
      },
      asyncWorkloadFn: sdk.asyncWorkloadFn as NetlifyQueueNamespace['asyncWorkloadFn'],
      ErrorDoNotRetry: sdk.ErrorDoNotRetry,
      ErrorRetryAfterDelay: sdk.ErrorRetryAfterDelay,
    }
  }
}
