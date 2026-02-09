import type { CronProvider } from '../../../../server/_shared/cron'
import { defineEventHandler } from 'h3'
import { createPlaygroundCron } from '../../../../server/_shared/cron'
import { nowIso } from '../../../../server/_shared/http'

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as CronProvider
  const start = Date.now()
  const { cron } = await createPlaygroundCron(event, provider)
  return { provider, supports: cron.supports, elapsed: Date.now() - start, timestamp: nowIso() }
})
