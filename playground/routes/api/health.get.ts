import { defineEventHandler } from 'h3'
import { nowIso } from '../../server/_shared/http'
import { getProvider } from '../../server/_shared/provider'

export default defineEventHandler((event) => {
  return {
    ok: true,
    provider: getProvider(event),
    timestamp: nowIso(),
  }
})
