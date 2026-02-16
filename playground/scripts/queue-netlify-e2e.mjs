import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { normalizeBase, parseArgs, parseBootstrapJson, resolveE2EOptions } from './queue-netlify-e2e-utils.mjs'

const results = []

function log(message) {
  process.stdout.write(`${message}\n`)
}

function pushResult(name, status, message) {
  results.push({ name, status, message })
}

function readConfigFile(configPath) {
  if (!configPath)
    return {}
  const resolvedPath = resolve(configPath)
  const raw = readFileSync(resolvedPath, 'utf8')
  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object')
    throw new Error(`Invalid config file: ${resolvedPath}`)
  return parsed
}

function runBootstrapCli(command) {
  const res = spawnSync(command, {
    shell: true,
    encoding: 'utf8',
  })
  const stdout = res.stdout || ''
  const stderr = res.stderr || ''
  if (stdout)
    process.stdout.write(stdout)
  if (stderr)
    process.stderr.write(stderr)
  if (res.status !== 0) {
    const snippet = (stderr || stdout).trim().slice(-500)
    throw new Error(`NETLIFY_QUEUE_E2E_CLI failed with exit code ${res.status}${snippet ? ` (${snippet})` : ''}`)
  }
  return {
    output: `${stdout}\n${stderr}`.trim(),
    deployPayload: parseBootstrapJson(stdout) || parseBootstrapJson(`${stdout}\n${stderr}`),
  }
}

async function requestJson(url, init) {
  const res = await fetch(url, init)
  const text = await res.text()
  let json = {}
  try {
    json = JSON.parse(text)
  }
  catch {
    json = { raw: text }
  }
  return { status: res.status, json, text }
}

function truncate(value, max = 350) {
  if (!value)
    return ''
  if (value.length <= max)
    return value
  return `${value.slice(0, max)}...`
}

function errorMessageFromJson(json, fallback) {
  if (json && typeof json === 'object') {
    if (typeof json.message === 'string' && json.message.trim())
      return json.message
    if (typeof json.error === 'string' && json.error.trim())
      return json.error
  }
  return fallback
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runAll() {
  log('Netlify Queue E2E runner\n')

  const args = parseArgs(process.argv.slice(2))
  const configPath = args.config || process.env.QUEUE_E2E_CONFIG
  const config = readConfigFile(configPath)

  let bootstrap = { deployPayload: null, output: '' }
  let resolvedOptions = resolveE2EOptions({
    args,
    env: process.env,
    config,
    deploy: null,
  })

  try {
    bootstrap = runBootstrapCli(resolvedOptions.bootstrapCommand)
    pushResult('bootstrap', 'passed', resolvedOptions.bootstrapCommand)
  }
  catch (error) {
    pushResult('bootstrap', 'failed', error instanceof Error ? error.message : String(error))
  }

  resolvedOptions = resolveE2EOptions({
    args,
    env: process.env,
    config,
    deploy: bootstrap.deployPayload,
  })
  const baseUrl = resolvedOptions.baseUrl

  if (!baseUrl) {
    pushResult('config', 'failed', 'Missing base URL. Set QUEUE_E2E_BASE_URL, --base-url, config.baseUrl, or return it from bootstrap deploy JSON.')
    log('Summary:')
    for (const item of results)
      log(`- ${item.name}: ${item.status}${item.message ? ` (${item.message})` : ''}`)
    process.exit(1)
  }

  const base = normalizeBase(baseUrl)
  const providerBase = `${base}/api/queue/netlify`
  const runId = `netlify-e2e-${Date.now()}-${randomUUID().slice(0, 8)}`
  let messageId = ''
  let eventName = process.env.NETLIFY_QUEUE_EVENT || 'unagent.playground.queue'

  pushResult('resolved', 'passed', `baseUrl=${base} runId=${runId}`)

  try {
    const { status, json } = await requestJson(`${base}/api/health`)
    if (status !== 200 || json?.ok !== true)
      throw new Error(`unexpected health response: ${status} ${JSON.stringify(json)}`)
    pushResult('health', 'passed', `provider=${json.provider}`)
  }
  catch (error) {
    pushResult('health', 'failed', error instanceof Error ? error.message : String(error))
  }

  try {
    const { status, json } = await requestJson(`${providerBase}/supports`)
    if (status !== 200 || json?.error)
      throw new Error(errorMessageFromJson(json, `unexpected status ${status}`))
    if (json?.supports?.sendBatch !== false)
      throw new Error('expected sendBatch support to be false')
    pushResult('supports', 'passed', 'sendBatch is unsupported as expected')
  }
  catch (error) {
    pushResult('supports', 'failed', error instanceof Error ? error.message : String(error))
  }

  try {
    const { status, json } = await requestJson(`${providerBase}/receipts/clear`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ runId }),
    })
    if (status !== 200 || json?.error)
      throw new Error(errorMessageFromJson(json, `unexpected status ${status}`))
    pushResult('clearReceipts', 'passed', `deleted=${json.deleted ?? 0}`)
  }
  catch (error) {
    pushResult('clearReceipts', 'failed', error instanceof Error ? error.message : String(error))
  }

  try {
    const { status, json } = await requestJson(`${providerBase}/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        payload: {
          hello: 'netlify-e2e',
          runId,
          sentAt: new Date().toISOString(),
        },
        options: { priority: 1, delaySeconds: 1 },
      }),
    })
    if (status !== 200 || json?.error)
      throw new Error(errorMessageFromJson(json, `unexpected status ${status}`))
    if (typeof json?.messageId !== 'string' || !json.messageId)
      throw new Error('missing messageId in send response')
    if (json?.sendStatus && json.sendStatus !== 'succeeded')
      throw new Error(`unexpected sendStatus: ${json.sendStatus}`)
    messageId = json.messageId
    if (typeof json?.event === 'string' && json.event.trim())
      eventName = json.event.trim()
    pushResult('send', 'passed', `messageId: ${messageId}${json?.baseUrl ? ` baseUrl=${json.baseUrl}` : ''}`)
  }
  catch (error) {
    pushResult('send', 'failed', error instanceof Error ? error.message : String(error))
  }

  try {
    if (!messageId)
      throw new Error('missing messageId from send step')

    const { status } = await requestJson(`${base}/.netlify/functions/queue-background?events=${encodeURIComponent(JSON.stringify([eventName]))}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-unagent-e2e': '1',
      },
      body: JSON.stringify([{
        eventName,
        eventId: messageId,
        data: { hello: 'netlify-e2e', runId },
        attemptContext: { attempt: 0 },
      }]),
    })

    if (status !== 200 && status !== 202)
      throw new Error(`unexpected background trigger status ${status}`)
    pushResult('triggerBackground', 'passed', `event=${eventName}`)
  }
  catch (error) {
    pushResult('triggerBackground', 'failed', error instanceof Error ? error.message : String(error))
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

  try {
    if (!messageId)
      throw new Error('missing messageId from send step')

    const deadline = Date.now() + resolvedOptions.pollTimeoutMs
    let lastResponse = null
    while (Date.now() <= deadline) {
      const url = `${providerBase}/receipts?runId=${encodeURIComponent(runId)}&eventId=${encodeURIComponent(messageId)}`
      const response = await requestJson(url)
      lastResponse = response
      if (response.status === 200 && response.json?.found === true && response.json?.receipt?.eventId === messageId) {
        pushResult('receipt', 'passed', `processedAt=${response.json.receipt.processedAt}`)
        lastResponse = null
        break
      }
      await sleep(resolvedOptions.pollIntervalMs)
    }

    if (lastResponse) {
      const payload = JSON.stringify(lastResponse.json || { raw: lastResponse.text })
      throw new Error(
        `background receipt not found in ${resolvedOptions.pollTimeoutMs}ms for eventId=${messageId || 'unknown'} `
        + `event=${eventName} baseUrl=${base} (last response: ${truncate(payload, 700)})`,
      )
    }
  }
  catch (error) {
    const suffix = bootstrap.output ? ` | bootstrap: ${truncate(bootstrap.output, 300)}` : ''
    pushResult('receipt', 'failed', `${error instanceof Error ? error.message : String(error)}${suffix}`)
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
