export class CronError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message)
    this.name = 'CronError'
  }
}

export class NotSupportedError extends CronError {
  constructor(method: string, provider: string) {
    super(`${method}() is not supported by the ${provider} provider`, 'NOT_SUPPORTED')
    this.name = 'NotSupportedError'
  }
}
