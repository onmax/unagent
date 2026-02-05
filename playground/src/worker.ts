import { Sandbox } from '@cloudflare/sandbox'
import { WorkflowEntrypoint } from 'cloudflare:workers'
// Built by `pnpm -C playground build:cf` (cloudflare_module preset).
// Wrangler will bundle this import into the Worker upload.
import nitroApp from '../.output/server/index.mjs'

export { Sandbox }

export class DemoWorkflow extends WorkflowEntrypoint {
  async run(
    event: { payload?: unknown },
    step: { do: (name: string, fn: () => Promise<unknown>) => Promise<unknown>, sleep: (name: string, duration: string) => Promise<void> },
  ): Promise<{ ok: boolean, payload: unknown }> {
    const payload = event?.payload ?? {}
    const result = await step.do('echo', async () => ({ payload }))
    await step.sleep('wait a bit', '30 seconds')
    return { ok: true, payload: (result as { payload?: unknown }).payload ?? result }
  }
}

export default {
  async fetch(req: Request, env: unknown, ctx: unknown): Promise<Response> {
    return (nitroApp as any).fetch(req, env, ctx)
  },
}
