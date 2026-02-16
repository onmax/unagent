import type { NetlifyUpstreamClient, NetlifyUpstreamSdk, NetlifyUpstreamSendEventResult } from '../src/_internal/netlify-upstream-types'
import type { NetlifyJobsAsyncWorkloadsClient as NetlifyJobsClient, NetlifyJobsSDK, NetlifyJobsSendEventResult } from '../src/jobs/types/netlify'
import type { NetlifyQueueAsyncWorkloadsClient as NetlifyQueueClient, NetlifyQueueSDK, NetlifyQueueSendEventResult } from '../src/queue/types/netlify'
import { describe, expect, it } from 'vitest'

type Assert<T extends true> = T

type QueueNetlifyClientParity = Assert<NetlifyUpstreamClient extends NetlifyQueueClient ? true : false>
type QueueNetlifyErrorDoNotRetryParity = Assert<NetlifyUpstreamSdk['ErrorDoNotRetry'] extends NetlifyQueueSDK['ErrorDoNotRetry'] ? true : false>
type QueueNetlifyErrorRetryAfterDelayParity = Assert<NetlifyUpstreamSdk['ErrorRetryAfterDelay'] extends NetlifyQueueSDK['ErrorRetryAfterDelay'] ? true : false>
type QueueNetlifySendResultParity = Assert<NetlifyUpstreamSendEventResult extends NetlifyQueueSendEventResult ? true : false>

type JobsNetlifyClientParity = Assert<NetlifyUpstreamClient extends NetlifyJobsClient ? true : false>
type JobsNetlifyErrorDoNotRetryParity = Assert<NetlifyUpstreamSdk['ErrorDoNotRetry'] extends NetlifyJobsSDK['ErrorDoNotRetry'] ? true : false>
type JobsNetlifyErrorRetryAfterDelayParity = Assert<NetlifyUpstreamSdk['ErrorRetryAfterDelay'] extends NetlifyJobsSDK['ErrorRetryAfterDelay'] ? true : false>
type JobsNetlifySendResultParity = Assert<NetlifyUpstreamSendEventResult extends NetlifyJobsSendEventResult ? true : false>

void (0 as unknown as QueueNetlifyClientParity)
void (0 as unknown as QueueNetlifyErrorDoNotRetryParity)
void (0 as unknown as QueueNetlifyErrorRetryAfterDelayParity)
void (0 as unknown as QueueNetlifySendResultParity)
void (0 as unknown as JobsNetlifyClientParity)
void (0 as unknown as JobsNetlifyErrorDoNotRetryParity)
void (0 as unknown as JobsNetlifyErrorRetryAfterDelayParity)
void (0 as unknown as JobsNetlifySendResultParity)

describe('netlify type parity', () => {
  it('keeps local queue and jobs netlify types assignable from upstream sdk types', () => {
    expect(true).toBe(true)
  })
})
