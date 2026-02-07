declare module '@vercel/queue' {
  export type MessageHandler<T = unknown> = (message: T, metadata: unknown) => unknown | Promise<unknown>

  export interface SendOptions<T = unknown> {
    idempotencyKey?: string
    retentionSeconds?: number
    delaySeconds?: number
    transport?: unknown
    client?: unknown
  }

  export function send<T = unknown>(topicName: string, payload: T, options?: SendOptions<T>): Promise<{ messageId: string }>

  export interface ReceiveOptions<T = unknown> {
    visibilityTimeoutSeconds?: number
    visibilityRefreshInterval?: number
    transport?: unknown
    client?: unknown
    maxConcurrency?: number
    limit?: number
    messageId?: string
    _payload?: T
  }

  export interface HandleCallbackOptions {
    client?: unknown
    visibilityTimeoutSeconds?: number
  }

  export interface ParsedCallbackRequest {
    queueName: string
    consumerGroup: string
    messageId: string
  }

  export function receive<T = unknown>(topicName: string, consumerGroup: string, handler: MessageHandler<T>, options?: ReceiveOptions<T>): Promise<void>
  export function handleCallback(handlers: Record<string, Record<string, MessageHandler>>, options?: HandleCallbackOptions): (request: Request) => Promise<Response>
  export function parseCallback(request: Request): Promise<ParsedCallbackRequest>
}

declare module '@upstash/qstash' {
  export class Receiver {
    constructor(opts: { currentSigningKey: string, nextSigningKey?: string })
    verify(opts: { body: string, signature: string, url: string }): Promise<boolean>
  }
}
