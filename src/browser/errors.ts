export class BrowserError extends Error {
  readonly code?: string
  readonly details?: Record<string, unknown>

  constructor(message: string, code?: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'BrowserError'
    this.code = code
    this.details = details
  }
}

export class NotSupportedError extends BrowserError {
  constructor(method: string, provider: string) {
    super(`${method}() is not supported by the ${provider} provider`, 'NOT_SUPPORTED')
    this.name = 'NotSupportedError'
  }
}
