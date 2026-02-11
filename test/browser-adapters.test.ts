import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBrowser } from '../src/browser'

const launch = vi.fn()

vi.mock('playwright', () => ({
  chromium: {
    launch,
  },
}), { virtual: true })

describe('browser/adapters', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('throws when provider is missing', async () => {
    await expect(createBrowser({})).rejects.toThrow('Browser provider is required')
  })

  it('throws clear browserbase config errors when required env is missing', async () => {
    await expect(createBrowser({ provider: { name: 'browserbase' } })).rejects.toThrow('projectId is required')

    process.env.BROWSERBASE_PROJECT_ID = 'proj-1'
    await expect(createBrowser({ provider: { name: 'browserbase' } })).rejects.toThrow('apiKey is required')
  })

  it('runs a local playwright session lifecycle and deterministic extraction', async () => {
    const page = {
      goto: vi.fn(async () => {}),
      click: vi.fn(async () => {}),
      fill: vi.fn(async () => {}),
      type: vi.fn(async () => {}),
      press: vi.fn(async () => {}),
      waitForSelector: vi.fn(async () => {}),
      url: vi.fn(() => 'https://example.com'),
      content: vi.fn(async () => '<html><body><h1>hello</h1></body></html>'),
      screenshot: vi.fn(async () => new Uint8Array([1, 2, 3])),
      evaluate: vi.fn(async (fn: () => unknown) => fn()),
      close: vi.fn(async () => {}),
    }

    const context = {
      newPage: vi.fn(async () => page),
      pages: vi.fn(() => [page]),
      close: vi.fn(async () => {}),
    }

    const browser = {
      newContext: vi.fn(async () => context),
      close: vi.fn(async () => {}),
    }

    launch.mockResolvedValue(browser)

    const client = await createBrowser({ provider: { name: 'playwright' } })
    const session = await client.newSession()
    const browserPage = await session.newPage({ url: 'https://example.com' })

    await browserPage.click('h1')
    await browserPage.type('#name', 'max', { clear: true })
    await browserPage.press('#name', 'Enter')
    await browserPage.waitForSelector('h1')

    const extracted = await browserPage.extract({
      kind: 'json',
      evaluate: () => ({ title: 'hello' }),
      schema: {
        type: 'object',
        properties: { title: { type: 'string' } },
        required: ['title'],
        additionalProperties: false,
      },
    })

    expect(extracted).toEqual({ title: 'hello' })

    await expect(browserPage.extract({
      kind: 'json',
      evaluate: () => ({ title: 1 }),
      schema: {
        type: 'object',
        properties: { title: { type: 'string' } },
        required: ['title'],
        additionalProperties: false,
      },
    })).rejects.toMatchObject({ code: 'SCHEMA_VALIDATION_FAILED' })

    const shot = await browserPage.screenshot({ type: 'jpeg' })
    expect(shot.mimeType).toBe('image/jpeg')
    expect(shot.bytes).toEqual(new Uint8Array([1, 2, 3]))

    const pages = await session.pages()
    expect(pages.length).toBe(1)

    await session.close()
    await client.close()

    expect(context.close).toHaveBeenCalled()
  })
})
