import { describe, expect, it } from 'vitest'

const defaultBootstrapCommand = 'pnpm -C playground build:netlify && cd playground && netlify deploy --json --dir="$PWD/public" --no-build'

describe.each(['jobs', 'queue'])('playground %s netlify e2e utils', (kind) => {
  const utilsPath = `../playground/scripts/${kind}-netlify-e2e-utils.mjs`
  const prefix = kind.toUpperCase()

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

  it.each([
    ['CLI', 0, 'https://cli.netlify.app', 'echo cli', 3000, 250],
    ['env', 1, 'https://env.netlify.app', 'echo env', 4000, 500],
    ['config', 2, 'https://config.netlify.app', 'echo cfg', 5000, 750],
    ['deploy', 3, 'https://site.netlify.app', defaultBootstrapCommand, 90_000, 2000],
    ['defaults', 4, undefined, defaultBootstrapCommand, 90_000, 2000],
  ])('resolves options from %s ahead of lower-priority sources', async (_, level, baseUrl, bootstrapCommand, pollTimeoutMs, pollIntervalMs) => {
    const { resolveE2EOptions } = await import(utilsPath)
    const options = resolveE2EOptions({
      args: level === 0 ? { baseUrl: 'https://cli.netlify.app', pollTimeoutMs: '3000', pollIntervalMs: '250', bootstrapCommand: 'echo cli' } : {},
      env: level <= 1
        ? {
            [`${prefix}_E2E_BASE_URL`]: 'https://env.netlify.app',
            [`${prefix}_E2E_POLL_TIMEOUT_MS`]: '4000',
            [`${prefix}_E2E_POLL_INTERVAL_MS`]: '500',
            [`NETLIFY_${prefix}_E2E_CLI`]: 'echo env',
          }
        : {},
      config: level <= 2 ? { baseUrl: 'https://config.netlify.app', pollTimeoutMs: 5000, pollIntervalMs: 750, bootstrapCommand: 'echo cfg' } : {},
      deploy: level <= 3 ? { ssl_url: 'https://site.netlify.app/' } : {},
    })

    expect(options).toEqual({ baseUrl, bootstrapCommand, pollTimeoutMs, pollIntervalMs })
  })
})
