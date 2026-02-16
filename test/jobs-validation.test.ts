import { describe, expect, it } from 'vitest'
import { validateJobsConfig } from '../src/jobs'

describe('jobs/validateJobsConfig', () => {
  it('returns blocking error when netlify event is missing', () => {
    const result = validateJobsConfig({ name: 'netlify', event: '' as any }, {
      'demo:job': {
        run: () => ({ result: true }),
      },
    })

    expect(result.ok).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'NETLIFY_EVENT_REQUIRED',
        severity: 'error',
      }),
    ])
  })

  it('returns blocking error when no jobs are registered', () => {
    const result = validateJobsConfig({ name: 'netlify', event: 'jobs.event' }, {})

    expect(result.ok).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'JOBS_REQUIRED',
        severity: 'error',
      }),
    ])
  })
})
