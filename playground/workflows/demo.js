import { sleep } from 'workflow'

export async function demoWorkflow(payload = {}) {
  'use workflow'
  await sleep('10s')
  return { ok: true, payload }
}
