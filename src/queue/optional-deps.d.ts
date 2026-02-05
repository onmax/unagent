declare module '@vercel/queue' {
  export interface SendOptions<T = unknown> {
    idempotencyKey?: string
    retentionSeconds?: number
    delaySeconds?: number
    transport?: unknown
    client?: unknown
  }

  export function send<T = unknown>(topicName: string, payload: T, options?: SendOptions<T>): Promise<{ messageId: string }>
}
