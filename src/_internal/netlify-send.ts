import type { NetlifySendEventResult } from './netlify-types'

export interface NetlifyDelayOptions {
  delaySeconds?: number
  delayUntil?: number | string
}

export function toNetlifyDelayUntil(options?: NetlifyDelayOptions): number | string | undefined {
  if (!options)
    return undefined
  if (options.delayUntil !== undefined)
    return options.delayUntil
  if (typeof options.delaySeconds === 'number')
    return Math.max(0, Math.round(options.delaySeconds * 1000))
  return undefined
}

export function assertNetlifySendSucceeded(
  eventName: string,
  response: NetlifySendEventResult,
  createError: (eventName: string, response: NetlifySendEventResult) => Error,
): void {
  if (response.sendStatus === 'failed')
    throw createError(eventName, response)
}
