import { createVector } from 'unagent/vector'

const VECTOR_DIMENSIONS = 32

function hashToVector(text) {
  const vec = new Float32Array(VECTOR_DIMENSIONS)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    const idx = i % VECTOR_DIMENSIONS
    vec[idx] += (code % 31) / 31
  }
  let norm = 0
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i]
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < vec.length; i++) vec[i] = vec[i] / norm
  return Array.from(vec)
}

const embeddings = {
  async resolve() {
    return {
      dimensions: VECTOR_DIMENSIONS,
      embedder: async texts => texts.map(hashToVector),
    }
  },
}

const demoDocs = [
  { id: 'doc-a', content: 'hello from vector e2e', metadata: { tag: 'e2e' } },
  { id: 'doc-b', content: 'vector search e2e check', metadata: { tag: 'e2e' } },
]

const results = []

function pushResult(name, status, message) {
  results.push({ name, status, message })
}

function log(msg) {
  process.stdout.write(`${msg}\n`)
}

function normalizeBase(url) {
  return url.endsWith('/') ? url.slice(0, -1) : url
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

async function postJson(base, path, body) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function runCloudflare() {
  const baseUrl = process.env.VECTORIZE_TEST_URL
  if (!baseUrl) {
    pushResult('cloudflare', 'skipped', 'VECTORIZE_TEST_URL not set')
    return
  }
  const base = normalizeBase(baseUrl)
  try {
    const indexRes = await postJson(base, '/api/vector/index', { docs: demoDocs })
    if (indexRes.error)
      throw new Error(indexRes.error)
    let searchRes
    for (let attempt = 0; attempt < 12; attempt++) {
      searchRes = await postJson(base, '/api/vector/search', { query: 'hello', options: { limit: 5, returnMetadata: true } })
      if (searchRes?.error)
        throw new Error(searchRes.error)
      if (Array.isArray(searchRes?.results) && searchRes.results.length > 0)
        break
      await sleep(2000)
    }
    if (!Array.isArray(searchRes?.results) || searchRes.results.length === 0)
      throw new Error('No search results')
    const removeRes = await postJson(base, '/api/vector/remove', { ids: demoDocs.map(d => d.id) })
    if (removeRes.error)
      throw new Error(removeRes.error)
    const clearRes = await postJson(base, '/api/vector/clear', {})
    if (clearRes.error && !String(clearRes.error).match(/not supported/i))
      throw new Error(clearRes.error)
    pushResult('cloudflare', 'passed', 'index/search/remove/clear')
  }
  catch (error) {
    pushResult('cloudflare', 'failed', error instanceof Error ? error.message : String(error))
  }
}

async function runUpstash() {
  const url = process.env.UPSTASH_VECTOR_URL || process.env.UPSTASH_VECTOR_REST_URL
  const token = process.env.UPSTASH_VECTOR_TOKEN || process.env.UPSTASH_VECTOR_REST_TOKEN
  if (!url || !token) {
    pushResult('upstash', 'skipped', 'UPSTASH_VECTOR_URL or UPSTASH_VECTOR_TOKEN missing')
    return
  }
  try {
    const vector = await createVector({
      provider: { name: 'upstash', url, token, namespace: 'unagent-e2e' },
    })
    await vector.index(demoDocs)
    let results = []
    for (let attempt = 0; attempt < 8; attempt++) {
      results = await vector.search('hello', { limit: 5, returnMetadata: true })
      if (results.length)
        break
      await sleep(1500)
    }
    if (!results.length)
      throw new Error('No search results')
    await vector.remove?.(demoDocs.map(d => d.id))
    await vector.clear?.()
    pushResult('upstash', 'passed', 'index/search/remove/clear')
  }
  catch (error) {
    pushResult('upstash', 'failed', error instanceof Error ? error.message : String(error))
  }
}

async function runPinecone() {
  const apiKey = process.env.PINECONE_API_KEY
  const host = process.env.PINECONE_HOST
  const index = process.env.PINECONE_INDEX
  const namespace = process.env.PINECONE_NAMESPACE
  if (!apiKey || (!host && !index)) {
    pushResult('pinecone', 'skipped', 'PINECONE_API_KEY and PINECONE_HOST or PINECONE_INDEX required')
    return
  }
  try {
    const vector = await createVector({
      provider: {
        name: 'pinecone',
        apiKey,
        host,
        index,
        namespace: namespace || 'unagent-e2e',
        embeddings,
      },
    })
    await vector.index(demoDocs)
    const results = await vector.search('hello', { limit: 5, returnMetadata: true })
    if (!results.length)
      throw new Error('No search results')
    await vector.remove?.(demoDocs.map(d => d.id))
    await vector.clear?.()
    pushResult('pinecone', 'passed', 'index/search/remove/clear')
  }
  catch (error) {
    pushResult('pinecone', 'failed', error instanceof Error ? error.message : String(error))
  }
}

async function runQdrant(useDocker) {
  const url = process.env.QDRANT_URL || (useDocker ? 'http://127.0.0.1:6333' : undefined)
  const apiKey = process.env.QDRANT_API_KEY
  const collection = process.env.QDRANT_COLLECTION || 'vectors'
  if (!url) {
    pushResult('qdrant', 'skipped', 'QDRANT_URL missing and VECTOR_E2E_DOCKER not set')
    return
  }
  let lastError
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const vector = await createVector({
        provider: {
          name: 'qdrant',
          url,
          apiKey,
          collection,
          embeddings,
        },
      })
      await vector.index(demoDocs)
      const results = await vector.search('hello', { limit: 5, returnMetadata: true })
      if (!results.length)
        throw new Error('No search results')
      await vector.remove?.(demoDocs.map(d => d.id))
      await vector.clear?.()
      pushResult('qdrant', 'passed', 'index/search/remove/clear')
      return
    }
    catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      if (attempt < 4 && /ECONNRESET|ECONNREFUSED|starting|unavailable/i.test(message)) {
        await sleep(2000)
        continue
      }
      pushResult('qdrant', 'failed', message)
      return
    }
  }
  pushResult('qdrant', 'failed', lastError instanceof Error ? lastError.message : String(lastError))
}

async function runWeaviate(useDocker) {
  const url = process.env.WEAVIATE_URL
  const apiKey = process.env.WEAVIATE_API_KEY
  const collection = process.env.WEAVIATE_COLLECTION || 'vectors'
  if (!url && !useDocker) {
    pushResult('weaviate', 'skipped', 'WEAVIATE_URL missing and VECTOR_E2E_DOCKER not set')
    return
  }
  let lastError
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const vector = await createVector({
        provider: url
          ? { name: 'weaviate', url, apiKey, collection, embeddings, skipInitChecks: true }
          : { name: 'weaviate', host: '127.0.0.1', port: 8080, grpcPort: 50051, apiKey, collection, embeddings, skipInitChecks: true },
      })
      await vector.index(demoDocs)
      let results = []
      for (let attempt = 0; attempt < 8; attempt++) {
        results = await vector.search('hello', { limit: 5, returnMetadata: true })
        if (results.length)
          break
        await sleep(1500)
      }
      if (!results.length)
        throw new Error('No search results')
      await vector.remove?.(demoDocs.map(d => d.id))
      await vector.clear?.()
      await vector.close?.()
      pushResult('weaviate', 'passed', 'index/search/remove/clear')
      return
    }
    catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      if (attempt < 4 && /ECONNRESET|ECONNREFUSED|starting|unavailable|init/i.test(message)) {
        await sleep(2000)
        continue
      }
      pushResult('weaviate', 'failed', message)
      return
    }
  }
  pushResult('weaviate', 'failed', lastError instanceof Error ? lastError.message : String(lastError))
}

async function runPgvector(useDocker) {
  const url = process.env.PGVECTOR_URL || (useDocker ? 'postgresql://postgres:postgres@localhost:5433/postgres' : undefined)
  if (!url) {
    pushResult('pgvector', 'skipped', 'PGVECTOR_URL missing and VECTOR_E2E_DOCKER not set')
    return
  }
  let lastError
  for (let attempt = 0; attempt < 5; attempt++) {
    let vector
    try {
      vector = await createVector({
        provider: { name: 'pgvector', url, embeddings, metric: 'cosine' },
      })
      await vector.index(demoDocs)
      const results = await vector.search('hello', { limit: 5, returnMetadata: true })
      if (!results.length)
        throw new Error('No search results')
      await vector.remove?.(demoDocs.map(d => d.id))
      await vector.clear?.()
      pushResult('pgvector', 'passed', 'index/search/remove/clear')
      return
    }
    catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      if (attempt < 4 && /ECONNRESET|ECONNREFUSED|starting up/i.test(message)) {
        await sleep(2000)
        continue
      }
      pushResult('pgvector', 'failed', message)
      return
    }
    finally {
      try {
        await vector?.close?.()
      }
      catch {}
    }
  }
  pushResult('pgvector', 'failed', lastError instanceof Error ? lastError.message : String(lastError))
}

async function runLibsql() {
  try {
    await import('@libsql/client')
  }
  catch {
    pushResult('libsql', 'skipped', 'Missing @libsql/client')
    return
  }
  const dbPath = process.env.LIBSQL_URL || 'file:playground/.tmp/vector-e2e-libsql.db'
  try {
    const vector = await createVector({
      provider: { name: 'libsql', url: dbPath, embeddings },
    })
    await vector.index(demoDocs)
    const results = await vector.search('hello', { limit: 5, returnMetadata: true })
    if (!results.length)
      throw new Error('No search results')
    await vector.remove?.(demoDocs.map(d => d.id))
    await vector.clear?.()
    await vector.close?.()
    pushResult('libsql', 'passed', 'index/search/remove/clear')
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('vector') || message.includes('vector_distance')) {
      pushResult('libsql', 'skipped', 'Vector functions unavailable in local libsql')
    }
    else {
      pushResult('libsql', 'failed', message)
    }
  }
}

async function runSqliteVec() {
  const nodeSqlite = globalThis.process?.getBuiltinModule?.('node:sqlite')
  if (!nodeSqlite) {
    pushResult('sqlite-vec', 'skipped', 'node:sqlite not available (requires Node >= 22.5)')
    return
  }
  try {
    await import('sqlite-vec')
  }
  catch {
    pushResult('sqlite-vec', 'skipped', 'Missing sqlite-vec dependency')
    return
  }
  const path = process.env.SQLITE_VEC_PATH || 'playground/.tmp/vector-e2e-sqlite.db'
  try {
    const vector = await createVector({
      provider: { name: 'sqlite-vec', path, embeddings },
    })
    await vector.index(demoDocs)
    const results = await vector.search('hello', { limit: 5, returnMetadata: true })
    if (!results.length)
      throw new Error('No search results')
    await vector.remove?.(demoDocs.map(d => d.id))
    await vector.clear?.()
    await vector.close?.()
    pushResult('sqlite-vec', 'passed', 'index/search/remove/clear')
  }
  catch (error) {
    pushResult('sqlite-vec', 'failed', error instanceof Error ? error.message : String(error))
  }
}

async function maybeCompose(action) {
  const cmd = `docker compose -f playground/docker-compose.vector.yml ${action}`
  const { spawnSync } = await import('node:child_process')
  const result = spawnSync(cmd, { shell: true, stdio: 'inherit' })
  if (result.status !== 0)
    throw new Error(`docker compose ${action} failed`)
}

async function runAll() {
  log('Vector E2E runner\n')

  const dockerRequested = process.env.VECTOR_E2E_DOCKER === '1'
  let dockerStarted = false

  if (dockerRequested) {
    try {
      await maybeCompose('up -d')
      dockerStarted = true
      await waitForPort('127.0.0.1', 5433, 45000)
      await waitForPort('127.0.0.1', 6333, 45000)
      await waitForPort('127.0.0.1', 8080, 60000)
      await waitForPort('127.0.0.1', 50051, 60000)
      await sleep(2000)
    }
    catch (error) {
      log(`docker compose up failed: ${error instanceof Error ? error.message : String(error)}`)
      dockerStarted = false
    }
  }

  try {
    await runCloudflare()
    await runUpstash()
    await runPinecone()
    const dockerReady = dockerRequested && dockerStarted
    await runQdrant(dockerReady)
    await runWeaviate(dockerReady)
    await runPgvector(dockerReady)
    await runLibsql()
    await runSqliteVec()
  }
  finally {
    if (dockerStarted) {
      try {
        await maybeCompose('down -v')
      }
      catch (error) {
        log(`docker compose down failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  log('\nSummary:')
  for (const item of results) {
    log(`- ${item.name}: ${item.status}${item.message ? ` (${item.message})` : ''}`)
  }

  const failed = results.filter(r => r.status === 'failed')
  if (failed.length) {
    process.exitCode = 1
  }
}

runAll().catch((error) => {
  console.error(error)
  process.exit(1)
})
