import { getStore } from '@netlify/blobs'
import { createJobs } from 'unagent/jobs'

const EVENT_NAME = process.env.NETLIFY_JOBS_EVENT || 'unagent.playground.jobs'
const STORE_NAME = 'unagent-playground-jobs-receipts'
const RECEIPT_JOB = 'playground:receipt'

export const config = {
  name: 'jobs-background',
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
    job: RECEIPT_JOB,
    attempt: Number(input.attempt || 0),
    processedAt: new Date().toISOString(),
    payload,
    result: input.result,
  }

  const store = getStore(STORE_NAME)
  await store.setJSON(makeReceiptKey(runId, receipt.eventId), receipt)
  return true
}

let jobsPromise

async function getJobs() {
  if (!jobsPromise) {
    jobsPromise = createJobs({
      provider: {
        name: 'netlify',
        event: EVENT_NAME,
      },
      jobs: {
        [RECEIPT_JOB]: {
          meta: { name: RECEIPT_JOB, description: 'Store deterministic jobs receipts' },
          async run(event) {
            const payload = toObject(event.payload)
            const netlify = toObject(event.context?.netlify)
            const eventId = typeof netlify.eventId === 'string' ? netlify.eventId : ''
            const eventName = typeof netlify.eventName === 'string' ? netlify.eventName : EVENT_NAME
            const attempt = Number(netlify.attempt || 0)
            const accepted = await writeReceipt({
              eventName,
              eventId,
              payload,
              attempt,
              result: { ok: true, runId: toRunId(payload) },
            })
            return {
              result: {
                accepted,
                runId: toRunId(payload),
                eventId,
                ts: Date.now(),
              },
            }
          },
        },
      },
    })
  }

  return await jobsPromise
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export default async function handler(request, context) {
  const jobs = await getJobs()

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

      const result = await jobs.run(RECEIPT_JOB, {
        payload: toObject(item.data ?? item.eventData),
        context: {
          netlify: {
            eventName: String(item.eventName || EVENT_NAME),
            eventId: String(item.eventId || ''),
            attempt: Number(item.attemptContext?.attempt || 0),
          },
        },
        dedupe: false,
      })

      if (result?.result?.accepted)
        processed += 1
    }

    return jsonResponse({ ok: true, processed }, 202)
  }

  return await jobs.netlify.handler(request, context)
}
