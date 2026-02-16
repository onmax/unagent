import { describe, expect, it } from 'vitest'

const utilsPath = '../playground/scripts/jobs-netlify-e2e-utils.mjs'

describe('playground jobs netlify e2e utils', () => {
  it('parses CLI args for config and runtime options', async () => {
    const { parseArgs } = await import(utilsPath)
    const parsed = parseArgs([
      '--config=./config.json',
      '--base-url',
      'https://example.netlify.app',
      '--bootstrap-command=echo ok',
      '--poll-timeout-ms',
      '120000',
      '--poll-interval-ms=500',
    ])

    expect(parsed).toEqual({
      config: './config.json',
      baseUrl: 'https://example.netlify.app',
      bootstrapCommand: 'echo ok',
      pollTimeoutMs: '120000',
      pollIntervalMs: '500',
    })
  })

  it('extracts deploy payload from mixed command output', async () => {
    const { parseBootstrapJson, resolveDeployBaseUrl } = await import(utilsPath)
    const output = [
      'Deploying...',
      '{"id":"dep-1","deploy_ssl_url":"https://dep-1--site.netlify.app","ssl_url":"https://site.netlify.app"}',
      'Done',
    ].join('\n')

    const deploy = parseBootstrapJson(output)
    expect(deploy?.id).toBe('dep-1')
    expect(resolveDeployBaseUrl(deploy)).toBe('https://dep-1--site.netlify.app')
  })

  it('resolves options with precedence CLI > env > config > deploy', async () => {
    const { resolveE2EOptions } = await import(utilsPath)
    const options = resolveE2EOptions({
      args: { baseUrl: 'https://cli.netlify.app', pollTimeoutMs: '3000', bootstrapCommand: 'echo cli' },
      env: { JOBS_E2E_BASE_URL: 'https://env.netlify.app', JOBS_E2E_POLL_TIMEOUT_MS: '4000' },
      config: { baseUrl: 'https://config.netlify.app', pollTimeoutMs: 5000, bootstrapCommand: 'echo cfg' },
      deploy: { deploy_ssl_url: 'https://deploy.netlify.app' },
    })

    expect(options.baseUrl).toBe('https://cli.netlify.app')
    expect(options.bootstrapCommand).toBe('echo cli')
    expect(options.pollTimeoutMs).toBe(3000)
  })

  it('falls back to deploy URL when baseUrl is missing from other sources', async () => {
    const { resolveE2EOptions } = await import(utilsPath)
    const options = resolveE2EOptions({
      args: {},
      env: {},
      config: {},
      deploy: { ssl_url: 'https://site.netlify.app/' },
    })

    expect(options.baseUrl).toBe('https://site.netlify.app')
  })
})
