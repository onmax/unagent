export const DEFAULT_POLL_TIMEOUT_MS = 90_000
export const DEFAULT_POLL_INTERVAL_MS = 2_000
export const DEFAULT_BOOTSTRAP_COMMAND = 'pnpm -C playground build:netlify && cd playground && netlify deploy --json --dir="$PWD/public" --no-build'

export function normalizeBase(url) {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export function parsePositiveInt(value, fallback) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0)
    return value
  if (typeof value !== 'string')
    return fallback
  const parsed = Number.parseInt(value.trim(), 10)
  if (!Number.isFinite(parsed) || parsed <= 0)
    return fallback
  return parsed
}

export function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (arg === '--base-url') {
      out.baseUrl = argv[i + 1]
      i += 1
      continue
    }
    if (arg.startsWith('--base-url=')) {
      out.baseUrl = arg.slice('--base-url='.length)
      continue
    }

    if (arg === '--config') {
      out.config = argv[i + 1]
      i += 1
      continue
    }
    if (arg.startsWith('--config=')) {
      out.config = arg.slice('--config='.length)
      continue
    }

    if (arg === '--bootstrap-command') {
      out.bootstrapCommand = argv[i + 1]
      i += 1
      continue
    }
    if (arg.startsWith('--bootstrap-command=')) {
      out.bootstrapCommand = arg.slice('--bootstrap-command='.length)
      continue
    }

    if (arg === '--poll-timeout-ms') {
      out.pollTimeoutMs = argv[i + 1]
      i += 1
      continue
    }
    if (arg.startsWith('--poll-timeout-ms=')) {
      out.pollTimeoutMs = arg.slice('--poll-timeout-ms='.length)
      continue
    }

    if (arg === '--poll-interval-ms') {
      out.pollIntervalMs = argv[i + 1]
      i += 1
      continue
    }
    if (arg.startsWith('--poll-interval-ms=')) {
      out.pollIntervalMs = arg.slice('--poll-interval-ms='.length)
    }
  }
  return out
}

function parseMaybeJson(text) {
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === 'object')
      return parsed
  }
  catch {}
  return null
}

export function parseBootstrapJson(output) {
  if (!output || typeof output !== 'string')
    return null

  const trimmed = output.trim()
  if (!trimmed)
    return null

  const whole = parseMaybeJson(trimmed)
  if (whole)
    return whole

  const lines = trimmed.split('\n').map(line => line.trim()).filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    const parsed = parseMaybeJson(lines[i])
    if (parsed)
      return parsed
  }

  for (let idx = trimmed.lastIndexOf('{'); idx >= 0; idx = trimmed.lastIndexOf('{', idx - 1)) {
    const candidate = trimmed.slice(idx).trim()
    const parsed = parseMaybeJson(candidate)
    if (parsed)
      return parsed
  }

  return null
}

export function resolveDeployBaseUrl(deployPayload) {
  if (!deployPayload || typeof deployPayload !== 'object')
    return undefined

  const candidates = [deployPayload, deployPayload.deploy, deployPayload.site].filter(Boolean)
  for (const candidate of candidates) {
    if (typeof candidate !== 'object')
      continue
    const baseUrl = candidate.deploy_ssl_url || candidate.ssl_url || candidate.url || candidate.deploy_url
    if (typeof baseUrl === 'string' && baseUrl.trim())
      return normalizeBase(baseUrl.trim())
  }

  return undefined
}

export function resolveE2EOptions({ args, env, config, deploy }) {
  const deployBaseUrl = resolveDeployBaseUrl(deploy)
  const baseUrl = args.baseUrl || env.QUEUE_E2E_BASE_URL || config.baseUrl || deployBaseUrl
  const bootstrapCommand = args.bootstrapCommand || env.NETLIFY_QUEUE_E2E_CLI || config.bootstrapCommand || DEFAULT_BOOTSTRAP_COMMAND
  const pollTimeoutMs = parsePositiveInt(
    args.pollTimeoutMs ?? env.QUEUE_E2E_POLL_TIMEOUT_MS ?? config.pollTimeoutMs,
    DEFAULT_POLL_TIMEOUT_MS,
  )
  const pollIntervalMs = parsePositiveInt(
    args.pollIntervalMs ?? env.QUEUE_E2E_POLL_INTERVAL_MS ?? config.pollIntervalMs,
    DEFAULT_POLL_INTERVAL_MS,
  )

  return {
    baseUrl,
    bootstrapCommand,
    pollTimeoutMs,
    pollIntervalMs,
  }
}
