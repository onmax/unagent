export interface MemoryQueueStoreItem<T = unknown> {
  messageId: string
  payload: T
  enqueuedAt: Date
}

export interface MemoryQueueStore {
  messages: MemoryQueueStoreItem[]
}

export interface MemoryQueueProviderOptions {
  name: 'memory'
  store?: MemoryQueueStore
}

export interface MemoryQueueNamespace {
  size: () => number
  peek: (limit?: number) => MemoryQueueStoreItem[]
  drain: (handler: (payload: unknown, meta: { messageId: string, enqueuedAt: Date }) => unknown | Promise<unknown>) => Promise<number>
}
