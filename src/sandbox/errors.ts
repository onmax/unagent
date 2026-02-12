export interface SandboxErrorMetadata {
  code?: string
  provider?: string
  details?: Record<string, unknown>
  cause?: unknown
}

export class SandboxError extends Error {
  readonly code?: string
  readonly provider?: string
  readonly details?: Record<string, unknown>
  override readonly cause?: unknown

  constructor(message: string, metadata?: string | SandboxErrorMetadata) {
    super(message)
    this.name = 'SandboxError'

    if (typeof metadata === 'string') {
      this.code = metadata
      return
    }

    this.code = metadata?.code
    this.provider = metadata?.provider
    this.details = metadata?.details
    this.cause = metadata?.cause
  }
}

export class NotSupportedError extends SandboxError {
  constructor(method: string, provider: string) {
    super(`${method}() is not supported by the ${provider} provider`, 'NOT_SUPPORTED')
    this.name = 'NotSupportedError'
  }
}
