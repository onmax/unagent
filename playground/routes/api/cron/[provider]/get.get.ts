import type { CronProvider } from '../../../../server/_shared/cron'
import { defineEventHandler, getQuery } from 'h3'
import { createPlaygroundCron } from '../../../../server/_shared/cron'
import { jsonError, nowIso } from '../../../../server/_shared/http'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as CronProvider
  const start = Date.now()
  const id = getQuery(event).id as string
  if (!id)
    return jsonError(event, 400, 'Missing id query param', { elapsed: Date.now() - start })

  const { cron } = await createPlaygroundCron(event, provider)
  const schedule = await cron.get(id)
  return { provider, schedule, elapsed: Date.now() - start, timestamp: nowIso() }
})
