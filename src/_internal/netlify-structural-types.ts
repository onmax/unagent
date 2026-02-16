export interface NetlifyClientConstructorOptionsLike {
  baseUrl?: string
  apiKey?: string
}

export interface NetlifySendEventOptionsLike {
  data?: unknown
  delayUntil?: number | string
  priority?: number
}

export interface NetlifySendEventResultLike {
  sendStatus: 'succeeded' | 'failed'
  eventId: string
}

export interface NetlifyAsyncWorkloadsClientLike {
  send: (eventName: string, options?: NetlifySendEventOptionsLike) => Promise<NetlifySendEventResultLike>
}

export interface NetlifyAsyncWorkloadsClientConstructorLike {
  new (options?: NetlifyClientConstructorOptionsLike): NetlifyAsyncWorkloadsClientLike
}

export interface NetlifySdkLike {
  AsyncWorkloadsClient: NetlifyAsyncWorkloadsClientConstructorLike
  asyncWorkloadFn: <T extends (...args: any[]) => any>(fn: T) => (...args: unknown[]) => Promise<Response | void>
  ErrorDoNotRetry: new (...args: any[]) => Error
  ErrorRetryAfterDelay: new (...args: any[]) => Error
}
