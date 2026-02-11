declare module 'playwright' {
  export const chromium: {
    launch: (options?: Record<string, unknown>) => Promise<any>
    connectOverCDP: (endpointURL: string, options?: Record<string, unknown>) => Promise<any>
  }
}

declare module '@browserbasehq/sdk' {
  export default class Browserbase {
    constructor(options?: Record<string, unknown>)

    sessions: {
      create: (body: Record<string, unknown>, options?: Record<string, unknown>) => Promise<any>
      update: (id: string, body: Record<string, unknown>, options?: Record<string, unknown>) => Promise<any>
    }
  }
}

declare module '@cloudflare/playwright' {
  export function launch(binding: unknown, options?: Record<string, unknown>): Promise<any>
}
