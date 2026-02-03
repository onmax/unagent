export class SandboxError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message)
    this.name = 'SandboxError'
  }
}

export class NotSupportedError extends SandboxError {
  constructor(method: string, provider: string) {
    super(`${method}() is not supported by the ${provider} provider`, 'NOT_SUPPORTED')
    this.name = 'NotSupportedError'
  }
}
