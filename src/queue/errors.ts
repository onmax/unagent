export class QueueError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message)
    this.name = 'QueueError'
  }
}

export class NotSupportedError extends QueueError {
  constructor(method: string, provider: string) {
    super(`${method}() is not supported by the ${provider} provider`, 'NOT_SUPPORTED')
    this.name = 'NotSupportedError'
  }
}
