import type { Hookable } from 'hookable'
import type { UsageInfo } from '../usage'
import { createHooks as createHookable } from 'hookable'

export interface AgentHooks {
  'tool:before': (payload: { name: string, args: unknown }) => void | Promise<void>
  'tool:after': (payload: { name: string, args: unknown, result: unknown }) => void | Promise<void>
  'tool:error': (payload: { name: string, error: Error }) => void | Promise<void>
  'llm:before': (payload: { messages: unknown[] }) => void | Promise<void>
  'llm:after': (payload: { response: unknown, usage?: UsageInfo }) => void | Promise<void>
  'iteration:start': (payload: { iteration: number }) => void | Promise<void>
  'iteration:end': (payload: { iteration: number }) => void | Promise<void>
}

export type AgentHooksInstance = Hookable<AgentHooks>

export function createAgentHooks(): AgentHooksInstance {
  return createHookable<AgentHooks>()
}

export { createHookable as createHooks, type Hookable }
