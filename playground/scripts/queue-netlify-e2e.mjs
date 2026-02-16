import { spawnSync } from 'node:child_process'

const results = []

function log(message) {
  process.stdout.write(`${message}\n`)
}

function pushResult(name, status, message) {
  results.push({ name, status, message })
}

function normalizeBase(url) {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

function parseArgs(argv) {
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
  }
  return out
}

function runBootstrapCli(command) {
  const res = spawnSync(command, {
    shell: true,
    stdio: 'inherit',
  })
  if (res.status !== 0)
    throw new Error(`NETLIFY_QUEUE_E2E_CLI failed with exit code ${res.status}`)
}

async function requestJson(url, init) {
  const res = await fetch(url, init)
  const json = await res.json()
  return { status: res.status, json }
}

async function runAll() {
  log('Netlify Queue E2E runner\n')

  const args = parseArgs(process.argv.slice(2))
  const baseUrl = args.baseUrl || process.env.QUEUE_E2E_BASE_URL
  const bootstrapCommand = process.env.NETLIFY_QUEUE_E2E_CLI

  if (!baseUrl) {
    log('Missing base URL. Pass --base-url or set QUEUE_E2E_BASE_URL.')
    process.exit(1)
  }
  if (!bootstrapCommand) {
    log('Missing NETLIFY_QUEUE_E2E_CLI.')
    process.exit(1)
  }

  try {
    runBootstrapCli(bootstrapCommand)
    pushResult('bootstrap', 'passed', 'CLI command executed')
  }
  catch (error) {
    pushResult('bootstrap', 'failed', error instanceof Error ? error.message : String(error))
  }

  const base = normalizeBase(baseUrl)
  const providerBase = `${base}/api/queue/netlify`

  try {
    const { status, json } = await requestJson(`${providerBase}/supports`)
    if (status !== 200 || json?.error)
      throw new Error(json?.error || `unexpected status ${status}`)
    if (json?.supports?.sendBatch !== false)
      throw new Error('expected sendBatch support to be false')
    pushResult('supports', 'passed', 'sendBatch is unsupported as expected')
  }
  catch (error) {
    pushResult('supports', 'failed', error instanceof Error ? error.message : String(error))
  }

  try {
    const { status, json } = await requestJson(`${providerBase}/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        payload: { hello: 'netlify-e2e' },
        options: { priority: 1, delaySeconds: 1 },
      }),
    })
    if (status !== 200 || json?.error)
      throw new Error(json?.error || `unexpected status ${status}`)
    if (typeof json?.messageId !== 'string' || !json.messageId)
      throw new Error('missing messageId in send response')
    pushResult('send', 'passed', `messageId: ${json.messageId}`)
  }
  catch (error) {
    pushResult('send', 'failed', error instanceof Error ? error.message : String(error))
  }

  try {
    const { status, json } = await requestJson(`${providerBase}/sendBatch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: [{ body: { hello: 'batch' }, contentType: 'json' }],
        options: { delaySeconds: 1 },
      }),
    })
    if (status !== 400)
      throw new Error(`expected 400 for sendBatch unsupported, got ${status}`)
    const text = String(json?.error || '')
    if (!text.includes('sendBatch() is not supported'))
      throw new Error(`unexpected sendBatch error: ${text || 'empty'}`)
    pushResult('sendBatch', 'passed', 'unsupported behavior verified')
  }
  catch (error) {
    pushResult('sendBatch', 'failed', error instanceof Error ? error.message : String(error))
  }

  log('Summary:')
  for (const item of results)
    log(`- ${item.name}: ${item.status}${item.message ? ` (${item.message})` : ''}`)

  const failed = results.some(item => item.status === 'failed')
  process.exit(failed ? 1 : 0)
}

runAll().catch((error) => {
  console.error(error)
  process.exit(1)
})
