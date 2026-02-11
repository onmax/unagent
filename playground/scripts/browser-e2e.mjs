import { createBrowser } from 'unagent/browser'

const results = []

function log(message) {
  process.stdout.write(`${message}\n`)
}

function pushResult(name, status, message) {
  results.push({ name, status, message })
}

function assert(condition, message) {
  if (!condition)
    throw new Error(message)
}

const PAGE_HTML = '<!doctype html><html><head><title>unagent browser e2e</title></head><body><h1 id="title">hello browser e2e</h1><p class="copy">playwright docker test</p></body></html>'
const PAGE_URL = `data:text/html,${encodeURIComponent(PAGE_HTML)}`

async function runPlaywright() {
  let browser
  let session
  try {
    try {
      await import('playwright')
    }
    catch {
      throw new Error('Missing playwright dependency. Use `pnpm playground:browser:e2e:docker` or install playwright locally.')
    }

    browser = await createBrowser({
      provider: {
        name: 'playwright',
        launchOptions: {
          headless: true,
        },
      },
    })

    session = await browser.newSession()
    const page = await session.newPage({ url: PAGE_URL })

    const text = await page.extract({ kind: 'text', selector: '#title' })
    assert(text === 'hello browser e2e', `unexpected text extraction: ${JSON.stringify(text)}`)

    const html = await page.extract({ kind: 'html', selector: '#title' })
    assert(typeof html === 'string' && html.includes('hello browser e2e'), 'unexpected html extraction')

    const json = await page.extract({
      kind: 'json',
      evaluate: () => {
        const doc = (globalThis).document
        return {
          title: String(doc?.title || ''),
          copy: String(doc?.querySelector?.('.copy')?.textContent || ''),
        }
      },
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          copy: { type: 'string' },
        },
        required: ['title', 'copy'],
        additionalProperties: false,
      },
    })
    assert(json?.title === 'unagent browser e2e', `unexpected json extraction: ${JSON.stringify(json)}`)

    let schemaValidationFailed = false
    try {
      await page.extract({
        kind: 'json',
        evaluate: () => ({ ok: 'wrong-type' }),
        schema: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
          },
          required: ['ok'],
          additionalProperties: false,
        },
      })
    }
    catch (error) {
      schemaValidationFailed = error?.code === 'SCHEMA_VALIDATION_FAILED'
    }
    assert(schemaValidationFailed, 'expected SCHEMA_VALIDATION_FAILED for invalid json payload')

    const screenshot = await page.screenshot({ type: 'png', fullPage: true })
    assert(screenshot.mimeType === 'image/png', `unexpected screenshot mime type: ${screenshot.mimeType}`)
    assert(screenshot.bytes.byteLength > 100, 'screenshot payload is unexpectedly small')

    const pages = await session.pages()
    assert(pages.length >= 1, 'expected at least one active page')

    pushResult('playwright', 'passed', 'session/page/extract/schema/screenshot')
  }
  catch (error) {
    pushResult('playwright', 'failed', error instanceof Error ? error.message : String(error))
  }
  finally {
    try {
      await session?.close()
    }
    catch {}
    try {
      await browser?.close()
    }
    catch {}
  }
}

async function runAll() {
  log('Browser E2E runner\n')
  await runPlaywright()

  log('Summary:')
  for (const item of results) {
    log(`- ${item.name}: ${item.status}${item.message ? ` (${item.message})` : ''}`)
  }

  const failed = results.some(r => r.status === 'failed')
  process.exit(failed ? 1 : 0)
}

runAll().catch((error) => {
  console.error(error)
  process.exit(1)
})
