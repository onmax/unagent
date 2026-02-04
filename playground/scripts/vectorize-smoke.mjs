const baseUrl = process.env.VECTORIZE_TEST_URL

if (!baseUrl) {
  console.error('Missing VECTORIZE_TEST_URL')
  process.exit(1)
}

const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

async function post(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

(async () => {
  const docs = [
    { id: 'doc-a', content: 'hello from smoke test', metadata: { tag: 'smoke' } },
    { id: 'doc-b', content: 'vector search smoke check', metadata: { tag: 'smoke' } },
  ]

  console.log('Indexing...')
  const indexRes = await post('/api/vector/index', { docs })
  console.log(indexRes)

  console.log('Searching...')
  const searchRes = await post('/api/vector/search', { query: 'hello', options: { limit: 5, returnMetadata: true } })
  console.log(searchRes)

  console.log('Removing...')
  const removeRes = await post('/api/vector/remove', { ids: ['doc-a', 'doc-b'] })
  console.log(removeRes)

  console.log('Clearing...')
  const clearRes = await post('/api/vector/clear', {})
  console.log(clearRes)

  console.log('Smoke test complete.')
})()
