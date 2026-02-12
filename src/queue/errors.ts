export interface QueueErrorMetadata {
  code?: string
  provider?: string
  httpStatus?: number
  upstreamError?: unknown
  details?: Record<string, unknown>
}

export class QueueError extends Error {
  readonly code?: string
  readonly provider?: string
  readonly httpStatus?: number
  readonly upstreamError?: unknown
  readonly details?: Record<string, unknown>

  constructor(message: string, metadata?: string | QueueErrorMetadata) {
    super(message)
    this.name = 'QueueError'

    if (typeof metadata === 'string') {
      this.code = metadata
      return
    }

    this.code = metadata?.code
    this.provider = metadata?.provider
    this.httpStatus = metadata?.httpStatus
    this.upstreamError = metadata?.upstreamError
    this.details = metadata?.details
  }
}

export class NotSupportedError extends QueueError {
  constructor(method: string, provider: string) {
    super(`${method}() is not supported by the ${provider} provider`, 'NOT_SUPPORTED')
    this.name = 'NotSupportedError'
  }
}
