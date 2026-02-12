import type { SandboxConfigValidationIssue, SandboxConfigValidationResult, SandboxProviderOptions } from './types/common'

type DenoProviderOptions = Extract<SandboxProviderOptions, { name: 'deno' }>

function validateDeno(provider: DenoProviderOptions): SandboxConfigValidationIssue[] {
  const issues: SandboxConfigValidationIssue[] = []

  const env = (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>
  const rawToken = env.DENO_DEPLOY_TOKEN
  if (!rawToken || !rawToken.trim()) {
    issues.push({
      code: 'DENO_TOKEN_REQUIRED',
      field: 'DENO_DEPLOY_TOKEN',
      severity: 'error',
      message: '[deno] DENO_DEPLOY_TOKEN is required',
    })
    return issues
  }

  const token = rawToken.trim()
  if (token.length !== rawToken.length) {
    issues.push({
      code: 'DENO_TOKEN_INVALID',
      field: 'DENO_DEPLOY_TOKEN',
      severity: 'error',
      message: '[deno] DENO_DEPLOY_TOKEN must not include leading or trailing whitespace',
    })
  }

  if (/[\r\n]/.test(rawToken) || /[\u0000-\u001F\u007F]/.test(rawToken)) {
    issues.push({
      code: 'DENO_TOKEN_INVALID',
      field: 'DENO_DEPLOY_TOKEN',
      severity: 'error',
      message: '[deno] DENO_DEPLOY_TOKEN contains invalid header characters',
    })
  }

  if (provider.sandboxEndpoint && /[\r\n]/.test(provider.sandboxEndpoint)) {
    issues.push({
      code: 'DENO_SANDBOX_ENDPOINT_INVALID',
      field: 'sandboxEndpoint',
      severity: 'error',
      message: '[deno] sandboxEndpoint contains invalid header characters',
    })
  }

  return issues
}

export function validateSandboxConfig(provider: SandboxProviderOptions): SandboxConfigValidationResult {
  const issues: SandboxConfigValidationIssue[] = []

  if (provider.name === 'deno')
    issues.push(...validateDeno(provider))

  return {
    provider: provider.name,
    ok: issues.every(issue => issue.severity !== 'error'),
    issues,
  }
}
