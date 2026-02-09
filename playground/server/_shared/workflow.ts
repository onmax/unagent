import { createWorkflow } from 'unagent/workflow'
import { demoWorkflow } from '../../workflows/demo.js'
import { getCloudflareEnv } from './provider'

export type WorkflowProvider = 'cloudflare' | 'vercel' | 'openworkflow'

export async function createPlaygroundWorkflow(event: any, provider: WorkflowProvider): Promise<{ provider: string, workflow: any }> {
  if (provider === 'cloudflare') {
    const env = getCloudflareEnv(event)
    if (!env)
      throw new Error('Missing Cloudflare env bindings')
    return {
      provider,
      workflow: await createWorkflow({ provider: { name: 'cloudflare', binding: env.MY_WORKFLOW } }),
    }
  }

  if (provider === 'vercel') {
    return {
      provider,
      workflow: await createWorkflow({ provider: { name: 'vercel', workflow: demoWorkflow } }),
    }
  }

  if (provider === 'openworkflow') {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl)
      throw new Error('Missing DATABASE_URL')
    const { createPostgresBackend } = await import('@openworkflow/backend-postgres')
    const { OpenWorkflow } = await import('openworkflow')
    const backend = createPostgresBackend(databaseUrl)
    const ow = new OpenWorkflow(backend)
    const workflow = ow.createWorkflow('playground-demo', demoWorkflow)
    return {
      provider,
      workflow: await createWorkflow({ provider: { name: 'openworkflow', workflow, ow, getRun: (id: string) => ow.getRun(id) } }),
    }
  }

  throw new Error(`Workflow provider "${provider}" is not supported`)
}
