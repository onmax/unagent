import { createWorkflow } from 'unagent/workflow'

function log(message) {
  process.stdout.write(`${message}\n`)
}

const debugEnabled = process.env.OPENWORKFLOW_E2E_DEBUG === '1'
function debug(message) {
  if (debugEnabled)
    log(message)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitForPort(host, port, timeoutMs = 30000) {
  const start = Date.now()
  const { connect } = await import('node:net')
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const socket = connect({ host, port }, () => {
          socket.end()
          resolve()
        })
        socket.on('error', reject)
      })
      return
    }
    catch {
      await sleep(500)
    }
  }
  throw new Error(`Timed out waiting for ${host}:${port}`)
}

async function maybeCompose(action) {
  const cmd = `docker compose -f playground/docker-compose.openworkflow.yml ${action}`
  const { spawnSync } = await import('node:child_process')
  const result = spawnSync(cmd, { shell: true, stdio: 'inherit' })
  if (result.status !== 0)
    throw new Error(`docker compose ${action} failed`)
}

async function resolveOpenWorkflow() {
  const mod = await import('openworkflow')
  return mod.OpenWorkflow || mod.default || mod
}

async function resolveBackendPostgres() {
  const mod = await import('@openworkflow/backend-postgres')
  return mod.BackendPostgres || mod.default || mod
}

async function connectBackend(BackendPostgres, databaseUrl, attempts = 10) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await BackendPostgres.connect(databaseUrl)
    }
    catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      if (attempt < attempts && /ECONNRESET|ECONNREFUSED|terminating connection|Connection terminated/i.test(message)) {
        await sleep(1000)
        continue
      }
      throw error
    }
  }
  throw lastError
}

function startWorker(worker) {
  if (!worker)
    return Promise.resolve()
  if (typeof worker.start === 'function')
    return worker.start()
  if (typeof worker.run === 'function')
    return worker.run()
  if (typeof worker.listen === 'function')
    return worker.listen()
  return Promise.resolve()
}

async function stopWorker(worker) {
  if (!worker)
    return
  if (typeof worker.stop === 'function')
    await worker.stop()
  else if (typeof worker.close === 'function')
    await worker.close()
}

async function closeBackend(backend) {
  if (!backend)
    return
  if (typeof backend.close === 'function')
    await backend.close()
  else if (typeof backend.disconnect === 'function')
    await backend.disconnect()
}

async function runE2E() {
  log('OpenWorkflow E2E runner\n')

  const dockerRequested = process.env.OPENWORKFLOW_E2E_DOCKER === '1'
  let dockerStarted = false

  if (dockerRequested) {
    try {
      await maybeCompose('up -d')
      dockerStarted = true
      await waitForPort('127.0.0.1', 5434, 45000)
      await sleep(1500)
    }
    catch (error) {
      log(`docker compose up failed: ${error instanceof Error ? error.message : String(error)}`)
      dockerStarted = false
    }
  }

  const databaseUrl = process.env.OPENWORKFLOW_DATABASE_URL
    || (dockerStarted ? 'postgresql://postgres:postgres@localhost:5434/postgres' : undefined)

  if (!databaseUrl) {
    log('OPENWORKFLOW_DATABASE_URL not set and docker not running')
    process.exitCode = 1
    return
  }

  let backend
  let worker
  try {
    const BackendPostgres = await resolveBackendPostgres()
    backend = await connectBackend(BackendPostgres, databaseUrl)

    const OpenWorkflow = await resolveOpenWorkflow()
    const ow = new OpenWorkflow({ backend })

    const workflow = ow.defineWorkflow(
      { name: 'unagent-e2e' },
      async ({ input, step }) => {
        const output = await step.run({ name: 'echo' }, async () => ({ ok: true, input }))
        return output
      },
    )

    worker = ow.newWorker({ concurrency: 1 })
    const workerStart = startWorker(worker)
    if (workerStart && typeof workerStart.then === 'function') {
      await Promise.race([workerStart, sleep(500)])
    }

    const client = await createWorkflow({
      provider: { name: 'openworkflow', workflow, ow },
    })

    const input = { id: 'e2e' }
    const run = await client.start(input)
    debug(`run id: ${run.id}`)

    const timeoutMs = 45000
    let output
    if (run.result) {
      output = await run.result({ timeoutMs })
    }
    else {
      const startedAt = Date.now()
      let status

      while (Date.now() - startedAt < timeoutMs) {
        if (worker && typeof worker.tick === 'function') {
          const claimed = await worker.tick()
          debug(`tick claimed: ${claimed}`)
        }
        status = await run.status()
        debug(`status: ${status.state}`)
        if (debugEnabled && ow?.backend?.getWorkflowRun) {
          const latest = await ow.backend.getWorkflowRun({ workflowRunId: run.id })
          debug(`backend status: ${latest?.status ?? 'unknown'}`)
        }
        if (['completed', 'failed', 'cancelled', 'terminated'].includes(status.state))
          break
        await sleep(500)
      }

      if (!status || status.state !== 'completed') {
        throw new Error(`Workflow did not complete (state: ${status?.state ?? 'unknown'})`)
      }
      output = status.output
    }

    const expected = { ok: true, input }
    if (JSON.stringify(output) !== JSON.stringify(expected)) {
      throw new Error(`Unexpected output: ${JSON.stringify(output)}`)
    }

    log('openworkflow: passed (start/status/output)')
  }
  finally {
    try {
      await stopWorker(worker)
    }
    catch (error) {
      log(`worker stop failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    try {
      await closeBackend(backend)
    }
    catch (error) {
      log(`backend close failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    if (dockerStarted) {
      try {
        await maybeCompose('down -v')
      }
      catch (error) {
        log(`docker compose down failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
}

runE2E().catch((error) => {
  console.error(error)
  process.exit(1)
})
