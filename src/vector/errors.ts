export class VectorError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message)
    this.name = 'VectorError'
  }
}

export class NotSupportedError extends VectorError {
  constructor(method: string, provider: string) {
    super(`${method}() is not supported by the ${provider} provider`, 'NOT_SUPPORTED')
    this.name = 'NotSupportedError'
  }
}
