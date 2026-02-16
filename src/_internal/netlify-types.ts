export interface NetlifyClientConstructorOptions {
  baseUrl?: string
  apiKey?: string
}

export interface NetlifySendEventOptions {
  data?: unknown
  delayUntil?: number | string
  priority?: number
}

export interface NetlifySendEventResult {
  sendStatus: 'succeeded' | 'failed'
  eventId: string
}

export interface NetlifyAsyncWorkloadsClient {
  send: (eventName: string, options?: NetlifySendEventOptions) => Promise<NetlifySendEventResult>
}

export interface NetlifyAsyncWorkloadsClientConstructor {
  new (options?: NetlifyClientConstructorOptions): NetlifyAsyncWorkloadsClient
}

export interface NetlifyAsyncWorkloadEvent {
  eventName: string
  eventData?: unknown
  eventId: string
  attempt?: number
  attemptContext?: { attempt?: number }
}

export interface NetlifySdk {
  AsyncWorkloadsClient: NetlifyAsyncWorkloadsClientConstructor
  asyncWorkloadFn: <T extends (...args: any[]) => any>(fn: T) => (...args: unknown[]) => Promise<Response | void>
  ErrorDoNotRetry: new (...args: any[]) => Error
  ErrorRetryAfterDelay: new (...args: any[]) => Error
}
