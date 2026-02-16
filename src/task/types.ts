import type { Promisable } from 'type-fest'

export interface TaskMeta {
  name?: string
  description?: string
}

export interface TaskEvent {
  name: string
  payload: Record<string, unknown>
  context: Record<string, unknown>
}

export interface TaskResult<T = unknown> {
  result?: T
}

export type TaskPromisable<T> = Promisable<T>

export interface Task<T = unknown> {
  meta?: TaskMeta
  run: (event: TaskEvent) => TaskPromisable<TaskResult<T>>
}

export type TaskEntry<T = unknown> = Task<T> | { resolve: () => Promise<Task<T>>, meta?: TaskMeta }

export interface TaskRunnerOptions {
  tasks: Record<string, TaskEntry>
  scheduledTasks?: Record<string, string | string[]>
}

export interface RunTaskOptions {
  payload?: Record<string, unknown>
  context?: Record<string, unknown>
  /**
   * Concurrent deduplication (same task + dedupe key returns the same promise).
   * Defaults to true.
   */
  dedupe?: boolean
  /**
   * Override the computed dedupe key.
   */
  dedupeKey?: string
  /**
   * Include context in computed dedupe key.
   * Defaults to false.
   */
  dedupeContext?: boolean
}

export interface RunCronTasksOptions {
  context?: Record<string, unknown>
  /**
   * What to do when no tasks are scheduled for the given cron.
   * Defaults to 'throw' (backwards compatible).
   */
  onMissing?: 'throw' | 'noop'
}

export interface TaskRunner {
  runTask: (name: string, options?: RunTaskOptions) => Promise<TaskResult>
  listTasks: () => { name: string, meta?: TaskMeta }[]
  scheduledTasks: Record<string, string[]>
  getCronTasks: (cron: string) => string[]
  runCronTasks: (cron: string, options?: RunCronTasksOptions) => Promise<TaskResult[]>
  startScheduler: () => () => void
}
