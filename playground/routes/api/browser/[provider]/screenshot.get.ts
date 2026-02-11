import type { BrowserProvider } from '../../../../server/_shared/browser'
import { Buffer } from 'node:buffer'
import { defineEventHandler } from 'h3'
import { createPlaygroundBrowser } from '../../../../server/_shared/browser'
import { jsonError, nowIso } from '../../../../server/_shared/http'

const DEFAULT_HTML = '<!doctype html><html><head><title>screenshot</title></head><body><h1>unagent</h1></body></html>'
const DEFAULT_URL = `data:text/html,${encodeURIComponent(DEFAULT_HTML)}`

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as BrowserProvider
  const start = Date.now()

  try {
    const { browser } = await createPlaygroundBrowser(event, provider)
    const session = await browser.newSession()

    try {
      const page = await session.newPage({ url: DEFAULT_URL })
      const screenshot = await page.screenshot({ type: 'png', fullPage: true })

      return {
        provider,
        screenshot: {
          mimeType: screenshot.mimeType,
          size: screenshot.bytes.byteLength,
          base64: bytesToBase64(screenshot.bytes),
        },
        elapsed: Date.now() - start,
        timestamp: nowIso(),
      }
    }
    finally {
      await session.close()
      await browser.close()
    }
  }
  catch (error) {
    return jsonError(event, 500, error instanceof Error ? error.message : String(error), {
      provider,
      elapsed: Date.now() - start,
    })
  }
})

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined')
    return Buffer.from(bytes).toString('base64')

  let binary = ''
  for (const value of bytes)
    binary += String.fromCharCode(value)

  const encode = (globalThis as { btoa?: (input: string) => string }).btoa
  if (!encode)
    throw new Error('No base64 encoder available in this runtime')
  return encode(binary)
}
