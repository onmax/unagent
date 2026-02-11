import type { BrowserProvider } from '../../../../server/_shared/browser'
import { defineEventHandler } from 'h3'
import { createPlaygroundBrowser } from '../../../../server/_shared/browser'
import { jsonError, nowIso, readJsonBody } from '../../../../server/_shared/http'

const DEFAULT_HTML = '<!doctype html><html><head><title>unagent extract</title></head><body><main><p id="copy">extract me</p></main></body></html>'
const DEFAULT_URL = `data:text/html,${encodeURIComponent(DEFAULT_HTML)}`

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as BrowserProvider
  const start = Date.now()
  const body = await readJsonBody(event)

  const kind = String(body.kind || 'text')
  const url = typeof body.url === 'string' ? body.url : DEFAULT_URL

  try {
    const { browser } = await createPlaygroundBrowser(event, provider)
    const session = await browser.newSession()

    try {
      const page = await session.newPage({ url })
      let result: unknown

      if (kind === 'html') {
        result = await page.extract({
          kind: 'html',
          selector: typeof body.selector === 'string' ? body.selector : undefined,
        })
      }
      else if (kind === 'json') {
        const schema = (body.schema && typeof body.schema === 'object') ? body.schema as Record<string, unknown> : undefined
        result = await page.extract({
          kind: 'json',
          evaluate: () => {
            const doc = (globalThis as any).document as any
            const selector = '#copy'
            const el = doc?.querySelector?.(selector)
            return {
              title: String(doc?.title || ''),
              text: String(el?.textContent || ''),
            }
          },
          schema,
        })
      }
      else {
        result = await page.extract({
          kind: 'text',
          selector: typeof body.selector === 'string' ? body.selector : 'body',
          all: !!body.all,
          trim: body.trim !== false,
        })
      }

      return {
        provider,
        kind,
        result,
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
      kind,
      elapsed: Date.now() - start,
    })
  }
})
