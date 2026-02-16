export type NetlifyAsyncWorkloadsModule = typeof import('@netlify/async-workloads')

export type NetlifyUpstreamSdk = Pick<NetlifyAsyncWorkloadsModule, 'AsyncWorkloadsClient' | 'asyncWorkloadFn' | 'ErrorDoNotRetry' | 'ErrorRetryAfterDelay'>
export type NetlifyUpstreamClient = InstanceType<NetlifyUpstreamSdk['AsyncWorkloadsClient']>
export type NetlifyUpstreamSendEventResult = Awaited<ReturnType<NetlifyUpstreamClient['send']>>
export type NetlifyUpstreamEvent = Parameters<Parameters<NetlifyUpstreamSdk['asyncWorkloadFn']>[0]>[0]
