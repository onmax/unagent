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

export type MaybePromise<T> = T | Promise<T>

export interface Task<T = unknown> {
  meta?: TaskMeta
  run: (event: TaskEvent) => MaybePromise<TaskResult<T>>
}

export type TaskEntry<T = unknown> = Task<T> | { resolve: () => Promise<Task<T>>, meta?: TaskMeta }

export interface TaskRunnerOptions {
  tasks: Record<string, TaskEntry>
  scheduledTasks?: Record<string, string | string[]>
}

export interface RunTaskOptions {
  payload?: Record<string, unknown>
  context?: Record<string, unknown>
}

export interface RunCronTasksOptions {
  context?: Record<string, unknown>
}

export interface TaskRunner {
  runTask: (name: string, options?: RunTaskOptions) => Promise<TaskResult>
  listTasks: () => { name: string, meta?: TaskMeta }[]
  scheduledTasks: Record<string, string[]>
  getCronTasks: (cron: string) => string[]
  runCronTasks: (cron: string, options?: RunCronTasksOptions) => Promise<TaskResult[]>
  startScheduler: () => () => void
}
