import { defineEventHandler, getHeaders, getRequestURL, readRawBody } from 'h3'
import { jsonError } from '../../../../server/_shared/http'
import { getProvider } from '../../../../server/_shared/provider'
import { VERCEL_QUEUE_CONSUMER, VERCEL_QUEUE_TOPIC } from '../../../../server/_shared/queue'

let callbackHandler: ((request: Request) => Promise<Response>) | null = null

async function getCallbackHandler(): Promise<(request: Request) => Promise<Response>> {
  if (callbackHandler)
    return callbackHandler

  const { handleCallback } = await import('@vercel/queue')
  callbackHandler = handleCallback({
    [VERCEL_QUEUE_TOPIC]: {
      [VERCEL_QUEUE_CONSUMER]: async (message, metadata) => {
        console.warn('[queue callback]', { message, metadata })
      },
    },
  })

  return callbackHandler
}

export default defineEventHandler(async (event) => {
  const provider = getProvider(event)
  if (provider !== 'vercel')
    return jsonError(event, 400, 'queue callbacks are only supported on Vercel', { provider })

  const url = getRequestURL(event)
  const headers = new Headers(getHeaders(event) as any)
  const rawBody = await readRawBody(event)

  const request = new Request(url.toString(), {
    method: event.method,
    headers,
    body: rawBody || undefined,
  })

  return (await getCallbackHandler())(request)
})
