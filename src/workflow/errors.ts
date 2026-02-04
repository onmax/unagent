export class WorkflowError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message)
    this.name = 'WorkflowError'
  }
}

export class NotSupportedError extends WorkflowError {
  constructor(method: string, provider: string) {
    super(`${method}() is not supported by the ${provider} provider`, 'NOT_SUPPORTED')
    this.name = 'NotSupportedError'
  }
}
