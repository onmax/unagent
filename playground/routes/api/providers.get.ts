import { defineEventHandler } from 'h3'
import { nowIso } from '../../server/_shared/http'
import { getProvider } from '../../server/_shared/provider'
import { getProvidersMatrix } from '../../server/_shared/providers'

export default defineEventHandler((event) => {
  return {
    runtime: getProvider(event),
    providers: getProvidersMatrix(event),
    timestamp: nowIso(),
  }
})
