import type { CronProvider } from '../../../../server/_shared/cron'
import { defineEventHandler } from 'h3'
import { createPlaygroundCron } from '../../../../server/_shared/cron'
import { jsonError, nowIso, readJsonBody } from '../../../../server/_shared/http'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as CronProvider
  const start = Date.now()
  const body = await readJsonBody(event)
  if (!body.id)
    return jsonError(event, 400, 'Missing id', { elapsed: Date.now() - start })

  const { cron } = await createPlaygroundCron(event, provider)
  await cron.delete(body.id as string)
  return { provider, deleted: body.id, elapsed: Date.now() - start, timestamp: nowIso() }
})
