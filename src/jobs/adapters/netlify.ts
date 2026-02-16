import type { JobEnqueueOptions, JobEnqueueResult, JobEnvelope, JobResult, RunJobOptions } from '../types/common'
import type { NetlifyJobsNamespace, NetlifyJobsProviderOptions, NetlifyJobsSendEventResult } from '../types/netlify'
import { JobsError } from '../errors'
import { BaseJobsAdapter } from './base'

type NetlifyAsyncWorkloadsModule = typeof import('@netlify/async-workloads')
type NetlifyJobsUpstreamSdk = Pick<NetlifyAsyncWorkloadsModule, 'AsyncWorkloadsClient' | 'asyncWorkloadFn' | 'ErrorDoNotRetry' | 'ErrorRetryAfterDelay'>
type NetlifyJobsUpstreamClient = InstanceType<NetlifyJobsUpstreamSdk['AsyncWorkloadsClient']>
type NetlifyJobsUpstreamEvent = Parameters<Parameters<NetlifyJobsUpstreamSdk['asyncWorkloadFn']>[0]>[0]
type NetlifyAsyncWorkloadEventInput = Pick<NetlifyJobsUpstreamEvent, 'eventName' | 'eventData' | 'eventId' | 'attempt'> & { attemptContext?: { attempt?: number } }

interface NetlifyJobsAdapterOptions {
  provider: NetlifyJobsProviderOptions
  sdk: NetlifyJobsUpstreamSdk
  hasJob: (name: string) => boolean
  runJob: (name: string, options?: RunJobOptions) => Promise<JobResult>
}

function toDelayUntil(options?: { delaySeconds?: number, delayUntil?: number | string }): number | string | undefined {
  if (!options)
    return undefined
  if (options.delayUntil !== undefined)
    return options.delayUntil
  if (typeof options.delaySeconds === 'number')
    return Math.max(0, Math.round(options.delaySeconds * 1000))
  return undefined
}

function assertSendSucceeded(eventName: string, response: NetlifyJobsSendEventResult): void {
  if (response.sendStatus === 'failed') {
    throw new JobsError(`@netlify/async-workloads AsyncWorkloadsClient.send failed for event "${eventName}"`, {
      code: 'NETLIFY_SEND_FAILED',
      provider: 'netlify',
      upstreamError: response,
      details: {
        eventId: response.eventId,
        eventName,
        sendStatus: response.sendStatus,
      },
    })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function toAttempt(event: NetlifyAsyncWorkloadEventInput): number {
  const direct = Number(event.attempt)
  if (Number.isFinite(direct))
    return direct

  const nested = Number(event.attemptContext?.attempt)
  if (Number.isFinite(nested))
    return nested

  return 0
}

function normalizePayload(payload: unknown): Record<string, unknown> {
  if (isRecord(payload))
    return payload
  if (payload === undefined)
    return {}
  return { value: payload }
}

function parseEnvelope(eventData: unknown): JobEnvelope {
  if (!isRecord(eventData)) {
    throw new JobsError('Netlify job payload envelope must be an object', {
      code: 'NETLIFY_INVALID_ENVELOPE',
      provider: 'netlify',
      httpStatus: 400,
    })
  }

  const job = typeof eventData.job === 'string' ? eventData.job.trim() : ''
  if (!job) {
    throw new JobsError('Netlify job payload envelope is missing "job"', {
      code: 'NETLIFY_INVALID_ENVELOPE',
      provider: 'netlify',
      httpStatus: 400,
      details: { field: 'job' },
    })
  }

  const enqueuedAtRaw = typeof eventData.enqueuedAt === 'string' ? eventData.enqueuedAt.trim() : ''
  const enqueuedAt = enqueuedAtRaw || new Date().toISOString()

  return {
    job,
    enqueuedAt,
    payload: eventData.payload,
  }
}

export class NetlifyJobsAdapter extends BaseJobsAdapter {
  readonly provider = 'netlify' as const
  readonly supports = {
    enqueue: true,
    providerHandler: true,
  }

  private event: string
  private sdk: NetlifyJobsUpstreamSdk
  private client: NetlifyJobsUpstreamClient | NonNullable<NetlifyJobsProviderOptions['client']>
  private hasJob: NetlifyJobsAdapterOptions['hasJob']
  private runJob: NetlifyJobsAdapterOptions['runJob']
  private wrappedHandler: NetlifyJobsNamespace['handler']

  constructor(options: NetlifyJobsAdapterOptions) {
    super()
    this.event = options.provider.event
    this.sdk = options.sdk
    this.hasJob = options.hasJob
    this.runJob = options.runJob
    this.client = options.provider.client || new options.sdk.AsyncWorkloadsClient({
      ...(options.provider.baseUrl ? { baseUrl: options.provider.baseUrl } : {}),
      ...(options.provider.apiKey ? { apiKey: options.provider.apiKey } : {}),
    })
    this.wrappedHandler = options.sdk.asyncWorkloadFn(async (event: NetlifyJobsUpstreamEvent) => {
      await this.handleEvent(event)
    }) as NetlifyJobsNamespace['handler']
  }

  async enqueueEnvelope(envelope: JobEnvelope, options: JobEnqueueOptions = {}): Promise<JobEnqueueResult> {
    if (!this.client || typeof this.client.send !== 'function')
      throw new JobsError('@netlify/async-workloads AsyncWorkloadsClient.send is not available')

    const delayUntil = toDelayUntil(options)
    const response = await this.client.send(this.event, {
      data: envelope,
      ...(delayUntil !== undefined ? { delayUntil } : {}),
      ...(options.priority !== undefined ? { priority: options.priority } : {}),
    })

    assertSendSucceeded(this.event, response)

    return { messageId: response.eventId, sendStatus: response.sendStatus }
  }

  private async handleEvent(event: NetlifyAsyncWorkloadEventInput): Promise<void> {
    if (!event || typeof event !== 'object') {
      throw new JobsError('Invalid Netlify event payload for jobs handler', {
        code: 'NETLIFY_INVALID_EVENT',
        provider: 'netlify',
        httpStatus: 400,
      })
    }

    if (event.eventName !== this.event)
      return

    const envelope = parseEnvelope(event.eventData)

    if (!this.hasJob(envelope.job)) {
      throw new JobsError(`Job "${envelope.job}" is not registered`, {
        code: 'JOB_NOT_REGISTERED',
        provider: 'netlify',
        httpStatus: 400,
        details: {
          job: envelope.job,
          eventName: event.eventName,
          eventId: event.eventId,
        },
      })
    }

    await this.runJob(envelope.job, {
      payload: normalizePayload(envelope.payload),
      context: {
        netlify: {
          eventName: event.eventName,
          eventId: event.eventId,
          attempt: toAttempt(event),
        },
      },
      dedupeKey: event.eventId,
    })
  }

  override get netlify(): NetlifyJobsNamespace {
    const event = this.event
    const sdk = this.sdk
    const client = this.client

    return {
      event,
      native: client,
      handler: this.wrappedHandler,
      asyncWorkloadFn: sdk.asyncWorkloadFn as NetlifyJobsNamespace['asyncWorkloadFn'],
      ErrorDoNotRetry: sdk.ErrorDoNotRetry,
      ErrorRetryAfterDelay: sdk.ErrorRetryAfterDelay,
      sendEnvelope: async (envelope, options = {}) => {
        return this.enqueueEnvelope(envelope, {
          delayUntil: options.delayUntil,
          priority: options.priority,
        })
      },
    }
  }
}
