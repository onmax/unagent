import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBrowser } from '../src/browser'

const cfLaunch = vi.fn()

vi.mock('@cloudflare/playwright', () => ({
  launch: cfLaunch,
}), { virtual: true })

describe('browser/cloudflare provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires a cloudflare binding', async () => {
    await expect(createBrowser({ provider: { name: 'cloudflare', binding: undefined as unknown } })).rejects.toThrow('binding is required')
  })

  it('launches with @cloudflare/playwright and supports basic session lifecycle', async () => {
    const page = {
      goto: vi.fn(async () => {}),
      click: vi.fn(async () => {}),
      fill: vi.fn(async () => {}),
      type: vi.fn(async () => {}),
      press: vi.fn(async () => {}),
      waitForSelector: vi.fn(async () => {}),
      url: vi.fn(() => 'https://example.com'),
      content: vi.fn(async () => '<html></html>'),
      screenshot: vi.fn(async () => new Uint8Array([9])),
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

    cfLaunch.mockResolvedValue(browser)

    const binding = { binding: true }
    const client = await createBrowser({ provider: { name: 'cloudflare', binding } })
    const session = await client.newSession()
    const browserPage = await session.newPage({ url: 'https://example.com' })

    await browserPage.extract({ kind: 'text', selector: 'body' })
    const shot = await browserPage.screenshot({ type: 'png' })

    expect(shot.mimeType).toBe('image/png')
    expect(cfLaunch).toHaveBeenCalledWith(binding, {})
    expect(client.cloudflare.native.binding).toBe(binding)

    await session.close()
    await client.close()
  })
})
