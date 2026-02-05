import { createWorkflow } from 'unagent/workflow'
import { demoWorkflow } from '../../workflows/demo.js'
import { getCloudflareEnv, getProvider } from './provider'

export async function createPlaygroundWorkflow(event: any): Promise<{ provider: string, workflow: any }> {
  const provider = getProvider(event)
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

  throw new Error('Workflow is not available on this runtime')
}
