import type { JobsProvider } from '../../../../server/_shared/jobs'
import { defineEventHandler } from 'h3'
import { JobsError } from 'unagent/jobs'
import { jsonError, nowIso, readJsonBody } from '../../../../server/_shared/http'
import { createPlaygroundJobs, getPlaygroundNetlifyJobsConfig } from '../../../../server/_shared/jobs'

function resolveStatus(error: JobsError): number {
  if (typeof error.httpStatus === 'number')
    return error.httpStatus
  if (error.code === 'JOB_NOT_REGISTERED' || error.code === 'JOBS_CONFIG_INVALID' || error.code?.startsWith('NETLIFY_'))
    return 400
  return 500
}

export default defineEventHandler(async (event) => {
  const provider = event.context.params!.provider as JobsProvider
  const start = Date.now()
  const body = await readJsonBody(event)

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name)
    return jsonError(event, 400, 'Missing job name', { provider, elapsed: Date.now() - start })

  const payload = Object.prototype.hasOwnProperty.call(body, 'payload') ? body.payload : {}
  const options = body.options && typeof body.options === 'object' ? body.options : {}

  try {
    const { jobs } = await createPlaygroundJobs(provider)
    const result = await jobs.enqueue(name, payload, options)

    return {
      provider,
      jobsProvider: jobs.provider,
      ...(provider === 'netlify'
        ? {
            ...getPlaygroundNetlifyJobsConfig(),
          }
        : {}),
      name,
      ...result,
      elapsed: Date.now() - start,
      timestamp: nowIso(),
    }
  }
  catch (error) {
    if (error instanceof JobsError) {
      return jsonError(event, resolveStatus(error), error.message, {
        provider,
        code: error.code,
        jobsProvider: error.provider,
        upstreamError: error.upstreamError,
        details: error.details,
        elapsed: Date.now() - start,
      })
    }

    return jsonError(event, 500, error instanceof Error ? error.message : String(error), {
      provider,
      elapsed: Date.now() - start,
    })
  }
})
