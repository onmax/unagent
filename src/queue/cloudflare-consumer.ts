import type { CloudflareQueueMessage, CloudflareQueueMessageBatch, CloudflareQueueRetryOptions } from './types/cloudflare'

export type CloudflareQueueBatchErrorAction = 'ack' | 'retry' | { retry: CloudflareQueueRetryOptions }

export interface CloudflareQueueBatchHandlerOptions<T = unknown> {
  onMessage: (message: CloudflareQueueMessage<T>, batch: CloudflareQueueMessageBatch<T>) => unknown | Promise<unknown>
  onError?: (error: unknown, message: CloudflareQueueMessage<T>, batch: CloudflareQueueMessageBatch<T>) => CloudflareQueueBatchErrorAction | void | Promise<CloudflareQueueBatchErrorAction | void>
  concurrency?: number
}

export function createCloudflareQueueBatchHandler<T = unknown>(options: CloudflareQueueBatchHandlerOptions<T>): (batch: CloudflareQueueMessageBatch<T>) => Promise<void> {
  const { onMessage, onError } = options
  const concurrency = Math.max(1, Number(options.concurrency ?? 1))

  return async (batch: CloudflareQueueMessageBatch<T>) => {
    const messages = Array.isArray(batch?.messages) ? batch.messages : []
    if (messages.length === 0)
      return

    let index = 0

    const worker = async (): Promise<void> => {
      while (true) {
        const i = index++
        if (i >= messages.length)
          return

        const message = messages[i]!
        try {
          await onMessage(message, batch)
          message.ack()
        }
        catch (error) {
          const action = onError ? await onError(error, message, batch) : undefined
          if (action === 'ack') {
            message.ack()
            continue
          }
          if (action && typeof action === 'object' && 'retry' in action) {
            message.retry(action.retry)
            continue
          }
          message.retry()
        }
      }
    }

    const workerCount = Math.min(concurrency, messages.length)
    await Promise.all(Array.from({ length: workerCount }, () => worker()))
  }
}
