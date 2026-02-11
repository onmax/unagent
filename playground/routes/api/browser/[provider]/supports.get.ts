import type { BrowserProvider } from '../../../../server/_shared/browser'
import { defineEventHandler } from 'h3'
import { isBrowserAvailable } from 'unagent/browser'
import { nowIso } from '../../../../server/_shared/http'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as BrowserProvider

  return {
    provider,
    available: isBrowserAvailable(provider),
    timestamp: nowIso(),
  }
})
