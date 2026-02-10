import type { Task } from './types'

export { TaskError } from './errors'
export { toCloudflareCrons, toVercelCrons } from './platform'
export { createTaskRunner } from './runner'
export type { MaybePromise, RunCronTasksOptions, RunTaskOptions, Task, TaskEvent, TaskMeta, TaskResult, TaskRunner, TaskRunnerOptions } from './types'

export function defineTask<T = unknown>(task: Task<T>): Task<T> {
  return task
}
