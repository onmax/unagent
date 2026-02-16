import { getStore } from '@netlify/blobs'

export const NETLIFY_JOBS_RECEIPT_STORE = 'unagent-playground-jobs-receipts'

export interface NetlifyJobsReceipt {
  eventId: string
  eventName: string
  runId: string
  job: string
  attempt: number
  processedAt: string
  payload: Record<string, unknown>
  result?: unknown
}

function normalizeSegment(value: string): string {
  return encodeURIComponent(value.trim())
}

function makePrefix(runId: string): string {
  return `${normalizeSegment(runId)}/`
}

function makeKey(runId: string, eventId: string): string {
  return `${makePrefix(runId)}${normalizeSegment(eventId)}.json`
}

function getReceiptStore(): ReturnType<typeof getStore> {
  return getStore(NETLIFY_JOBS_RECEIPT_STORE)
}

export async function readNetlifyJobsReceipt(runId: string, eventId: string): Promise<NetlifyJobsReceipt | null> {
  const store = getReceiptStore()
  return await store.get(makeKey(runId, eventId), { type: 'json' }) as NetlifyJobsReceipt | null
}

export async function listNetlifyJobsReceipts(runId: string, limit = 20): Promise<NetlifyJobsReceipt[]> {
  const store = getReceiptStore()
  const prefix = makePrefix(runId)
  const max = Math.max(1, Math.floor(limit))
  const receipts: NetlifyJobsReceipt[] = []

  for await (const page of store.list({ prefix, paginate: true })) {
    for (const blob of page.blobs) {
      if (receipts.length >= max)
        return receipts
      const item = await store.get(blob.key, { type: 'json' })
      if (item && typeof item === 'object')
        receipts.push(item as NetlifyJobsReceipt)
    }
  }

  return receipts
}

export async function clearNetlifyJobsReceipts(runId: string): Promise<number> {
  const store = getReceiptStore()
  const prefix = makePrefix(runId)
  let deleted = 0

  for await (const page of store.list({ prefix, paginate: true })) {
    for (const blob of page.blobs) {
      await store.delete(blob.key)
      deleted += 1
    }
  }

  return deleted
}
