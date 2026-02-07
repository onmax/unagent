import { defineEventHandler } from 'h3'
import { jsonError, nowIso } from '../../../server/_shared/http'
import { getProvider } from '../../../server/_shared/provider'

export default defineEventHandler((event) => {
  const start = Date.now()
  const token = process.env.QSTASH_TOKEN
  if (!token)
    return jsonError(event, 400, 'Missing QSTASH_TOKEN', { provider: getProvider(event), elapsed: Date.now() - start })

  return {
    ok: true,
    provider: getProvider(event),
    hasToken: true,
    elapsed: Date.now() - start,
    timestamp: nowIso(),
  }
})
