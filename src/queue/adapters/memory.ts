import type { QueueBatchMessage, QueueCapabilities, QueueSendBatchOptions, QueueSendOptions, QueueSendResult } from '../types/common'
import type { MemoryQueueNamespace, MemoryQueueStore, MemoryQueueStoreItem } from '../types/memory'
import { BaseQueueAdapter } from './base'

let _counter = 0
function createMessageId(): string {
  const random = (globalThis as any).crypto?.randomUUID?.()
  if (typeof random === 'string')
    return `mem_${random}`
  _counter++
  return `mem_${Date.now()}_${_counter}`
}

export class MemoryQueueAdapter extends BaseQueueAdapter {
  readonly provider = 'memory' as const
  readonly supports: QueueCapabilities = { sendBatch: true }

  private store: MemoryQueueStore

  constructor(store?: MemoryQueueStore) {
    super()
    this.store = store ?? { messages: [] }
  }

  async send<T = unknown>(payload: T, _options: QueueSendOptions = {}): Promise<QueueSendResult> {
    const item: MemoryQueueStoreItem<T> = {
      messageId: createMessageId(),
      payload,
      enqueuedAt: new Date(),
    }
    this.store.messages.push(item as any)
    return { messageId: item.messageId }
  }

  override async sendBatch(messages: QueueBatchMessage[], _options: QueueSendBatchOptions = {}): Promise<void> {
    for (const message of messages) {
      const item: MemoryQueueStoreItem = {
        messageId: createMessageId(),
        payload: message.body,
        enqueuedAt: new Date(),
      }
      this.store.messages.push(item)
    }
  }

  override get memory(): MemoryQueueNamespace {
    return {
      size: () => this.store.messages.length,
      peek: (limit = 10) => this.store.messages.slice(0, Math.max(0, limit)),
      drain: async (handler) => {
        let count = 0
        // Drain in FIFO order.
        while (this.store.messages.length) {
          const item = this.store.messages.shift()!
          await handler(item.payload, { messageId: item.messageId, enqueuedAt: item.enqueuedAt })
          count++
        }
        return count
      },
    }
  }
}
