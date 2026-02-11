import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBrowser } from '../src/browser'

const sessionsCreate = vi.fn()
const sessionsUpdate = vi.fn()
const connectOverCDP = vi.fn()

vi.mock('@browserbasehq/sdk', () => {
  return {
    default: class Browserbase {
      sessions = {
        create: sessionsCreate,
        update: sessionsUpdate,
      }

      constructor(_options?: Record<string, unknown>) {}
    },
  }
}, { virtual: true })

vi.mock('playwright', () => ({
  chromium: {
    connectOverCDP,
    launch: vi.fn(),
  },
}), { virtual: true })

describe('browser/browserbase provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a browserbase session and requests release on close', async () => {
    const page = {
      goto: vi.fn(async () => {}),
      click: vi.fn(async () => {}),
      fill: vi.fn(async () => {}),
      type: vi.fn(async () => {}),
      press: vi.fn(async () => {}),
      waitForSelector: vi.fn(async () => {}),
      url: vi.fn(() => 'https://example.com'),
      content: vi.fn(async () => '<html></html>'),
      screenshot: vi.fn(async () => new Uint8Array([1])),
      evaluate: vi.fn(async (fn: () => unknown) => fn()),
      close: vi.fn(async () => {}),
    }

    const context = {
      newPage: vi.fn(async () => page),
      pages: vi.fn(() => [page]),
      close: vi.fn(async () => {}),
    }

    const browser = {
      contexts: vi.fn(() => [context]),
      newContext: vi.fn(async () => context),
      close: vi.fn(async () => {}),
    }

    sessionsCreate.mockResolvedValue({
      id: 'sess-1',
      connectUrl: 'wss://browserbase.example/ws',
    })
    sessionsUpdate.mockResolvedValue({ ok: true })
    connectOverCDP.mockResolvedValue(browser)

    const client = await createBrowser({
      provider: {
        name: 'browserbase',
        apiKey: 'api-key',
        projectId: 'project-id',
      },
    })

    const session = await client.newSession()
    const browserPage = await session.newPage({ url: 'https://example.com' })

    const title = await browserPage.extract({
      kind: 'json',
      evaluate: () => ({ title: 'ok' }),
      schema: {
        type: 'object',
        properties: { title: { type: 'string' } },
        required: ['title'],
        additionalProperties: false,
      },
    })

    expect(title).toEqual({ title: 'ok' })
    expect(session.id).toBe('sess-1')
    expect(client.browserbase.activeSessionIds()).toContain('sess-1')

    await session.close()

    expect(sessionsUpdate).toHaveBeenCalledWith('sess-1', {
      projectId: 'project-id',
      status: 'REQUEST_RELEASE',
    })
    expect(client.browserbase.activeSessionIds()).not.toContain('sess-1')

    await client.close()
  })
})
