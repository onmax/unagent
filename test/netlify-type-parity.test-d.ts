import type { AsyncWorkloadsClient, ErrorDoNotRetry, ErrorRetryAfterDelay } from '@netlify/async-workloads'
import type { NetlifyJobsAsyncWorkloadsClient as NetlifyJobsClient, NetlifyJobsSDK, NetlifyJobsSendEventResult } from '../src/jobs/types/netlify'
import type { NetlifyQueueAsyncWorkloadsClient as NetlifyQueueClient, NetlifyQueueSDK, NetlifyQueueSendEventResult } from '../src/queue/types/netlify'
import { expectTypeOf } from 'vitest'

type SendEventResult = Awaited<ReturnType<AsyncWorkloadsClient['send']>>

expectTypeOf<AsyncWorkloadsClient>().toExtend<NetlifyQueueClient>()
expectTypeOf<typeof ErrorDoNotRetry>().toExtend<NetlifyQueueSDK['ErrorDoNotRetry']>()
expectTypeOf<typeof ErrorRetryAfterDelay>().toExtend<NetlifyQueueSDK['ErrorRetryAfterDelay']>()
expectTypeOf<SendEventResult>().toExtend<NetlifyQueueSendEventResult>()

expectTypeOf<AsyncWorkloadsClient>().toExtend<NetlifyJobsClient>()
expectTypeOf<typeof ErrorDoNotRetry>().toExtend<NetlifyJobsSDK['ErrorDoNotRetry']>()
expectTypeOf<typeof ErrorRetryAfterDelay>().toExtend<NetlifyJobsSDK['ErrorRetryAfterDelay']>()
expectTypeOf<SendEventResult>().toExtend<NetlifyJobsSendEventResult>()
