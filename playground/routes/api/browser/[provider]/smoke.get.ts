import type { BrowserProvider } from '../../../../server/_shared/browser'
import { defineEventHandler } from 'h3'
import { createPlaygroundBrowser } from '../../../../server/_shared/browser'
import { jsonError, nowIso } from '../../../../server/_shared/http'

const SMOKE_HTML = '<!doctype html><html><head><title>unagent browser smoke</title></head><body><h1 id="title">hello browser</h1></body></html>'
const SMOKE_URL = `data:text/html,${encodeURIComponent(SMOKE_HTML)}`

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as BrowserProvider
  const start = Date.now()

  try {
    const { browser } = await createPlaygroundBrowser(event, provider)
    const session = await browser.newSession()

    try {
      const page = await session.newPage({ url: SMOKE_URL })
      const text = await page.extract({ kind: 'text', selector: '#title' })
      const title = await page.extract({
        kind: 'json',
        evaluate: () => {
          const doc = (globalThis as any).document as any
          return { title: String(doc?.title || '') }
        },
      })
      const shot = await page.screenshot({ type: 'png' })

      return {
        provider,
        smoke: {
          text,
          title,
          screenshotBytes: shot.bytes.byteLength,
          screenshotMimeType: shot.mimeType,
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
