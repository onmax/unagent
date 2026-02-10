import type { RunCronTasksOptions, RunTaskOptions, TaskMeta, TaskResult, TaskRunner, TaskRunnerOptions } from './types'
import { Cron } from 'croner'
import { TaskError } from './errors'

export function createTaskRunner(options: TaskRunnerOptions): TaskRunner {
  const { tasks } = options

  // Normalize scheduledTasks: ensure all values are string[]
  const scheduledTasks: Record<string, string[]> = {}
  if (options.scheduledTasks) {
    for (const [cron, names] of Object.entries(options.scheduledTasks))
      scheduledTasks[cron] = Array.isArray(names) ? names : [names]
  }

  // Concurrent dedup: same task+payload returns same promise
  const running = new Map<string, Promise<TaskResult>>()

  function runTask(name: string, options: RunTaskOptions = {}): Promise<TaskResult> {
    const task = tasks[name]
    if (!task)
      throw new TaskError(`Task "${name}" is not registered`)

    const key = `${name}:${JSON.stringify(options.payload || {})}`
    const existing = running.get(key)
    if (existing)
      return existing

    const promise = Promise.resolve(task.run({
      name,
      payload: options.payload || {},
      context: options.context || {},
    })).finally(() => running.delete(key))

    running.set(key, promise)
    return promise
  }

  function listTasks(): { name: string, meta?: TaskMeta }[] {
    return Object.entries(tasks).map(([name, task]) => ({ name, meta: task.meta }))
  }

  function getCronTasks(cron: string): string[] {
    return scheduledTasks[cron] || []
  }

  function runCronTasks(cron: string, options: RunCronTasksOptions = {}): Promise<TaskResult[]> {
    const names = getCronTasks(cron)
    if (!names.length)
      throw new TaskError(`No tasks scheduled for cron "${cron}"`)
    return Promise.all(names.map(name => runTask(name, { context: options.context })))
  }

  function startScheduler(): () => void {
    return _startScheduler(scheduledTasks, runTask)
  }

  return { runTask, listTasks, scheduledTasks, getCronTasks, runCronTasks, startScheduler }
}

function _startScheduler(scheduledTasks: Record<string, string[]>, runTask: (name: string) => Promise<TaskResult>): () => void {
  const jobs: Cron[] = []

  for (const [cron, names] of Object.entries(scheduledTasks)) {
    const job = new Cron(cron, () => {
      for (const name of names)
        runTask(name).catch(err => console.error(`[unagent:task] ${name} failed:`, err))
    })
    jobs.push(job)
  }

  return () => jobs.forEach(j => j.stop())
}
