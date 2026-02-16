import { asyncWorkloadFn } from '@netlify/async-workloads'
import { getStore } from '@netlify/blobs'

const EVENT_NAME = 'unagent.playground.queue'
const STORE_NAME = 'unagent-playground-queue-receipts'

export const config = {
  name: 'queue-background',
  events: [EVENT_NAME],
}

function normalizeSegment(value) {
  return encodeURIComponent(String(value || '').trim())
}

function toObject(value) {
  return value && typeof value === 'object' ? value : {}
}

function makeReceiptKey(runId, eventId) {
  return `${normalizeSegment(runId)}/${normalizeSegment(eventId)}.json`
}

function toRunId(payload) {
  return typeof payload.runId === 'string' && payload.runId.trim()
    ? payload.runId.trim()
    : 'unknown'
}

async function writeReceipt(input) {
  if (input.eventName !== EVENT_NAME)
    return false

  const eventId = typeof input.eventId === 'string' ? input.eventId.trim() : ''
  if (!eventId)
    return false

  const payload = toObject(input.payload)
  const runId = toRunId(payload)
  const receipt = {
    eventId,
    eventName: EVENT_NAME,
    runId,
    attempt: Number(input.attempt || 0),
    processedAt: new Date().toISOString(),
    payload,
  }

  const store = getStore(STORE_NAME)
  await store.setJSON(makeReceiptKey(runId, receipt.eventId), receipt)
  return true
}

const handleAsyncWorkload = asyncWorkloadFn(async (event) => {
  await writeReceipt({
    eventName: event.eventName,
    eventId: event.eventId,
    payload: event.eventData,
    attempt: event.attempt,
  })
})

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export default async function handler(request, context) {
  if (request.headers.get('x-unagent-e2e') === '1') {
    let body = []
    try {
      const parsed = await request.json()
      body = Array.isArray(parsed) ? parsed : [parsed]
    }
    catch {
      return jsonResponse({ ok: false, processed: 0, error: 'invalid json body' }, 400)
    }

    let processed = 0
    for (const item of body) {
      if (!item || typeof item !== 'object')
        continue
      const accepted = await writeReceipt({
        eventName: String(item.eventName || ''),
        eventId: String(item.eventId || ''),
        payload: item.data ?? item.eventData,
        attempt: item.attemptContext?.attempt || 0,
      })
      if (accepted)
        processed += 1
    }

    return jsonResponse({ ok: true, processed }, 202)
  }

  return await handleAsyncWorkload(request, context)
}
