import type { RunCronTasksOptions, RunTaskOptions, Task, TaskMeta, TaskResult, TaskRunner, TaskRunnerOptions } from './types'
import { Cron } from 'croner'
import { TaskError } from './errors'

function isLazy(entry: unknown): entry is { resolve: () => Promise<Task>, meta?: TaskMeta } {
  return typeof (entry as any).resolve === 'function'
}

function base64FromBytes(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let out = ''
  let i = 0

  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
    out += alphabet[(n >> 18) & 63]
    out += alphabet[(n >> 12) & 63]
    out += alphabet[(n >> 6) & 63]
    out += alphabet[n & 63]
  }

  const remain = bytes.length - i
  if (remain === 1) {
    const n = bytes[i] << 16
    out += alphabet[(n >> 18) & 63]
    out += alphabet[(n >> 12) & 63]
    out += '=='
  }
  else if (remain === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8)
    out += alphabet[(n >> 18) & 63]
    out += alphabet[(n >> 12) & 63]
    out += alphabet[(n >> 6) & 63]
    out += '='
  }

  return out
}

function stableStringify(input: unknown): string {
  const seen = new WeakMap<object, number>()
  let nextId = 1

  const normalize = (value: unknown): any => {
    if (value === null)
      return null

    const t = typeof value
    if (t === 'string' || t === 'boolean')
      return value
    if (t === 'number') {
      if (Number.isFinite(value))
        return value
      return { __unagent_type: 'number', value: String(value) }
    }
    if (t === 'bigint')
      return { __unagent_type: 'bigint', value: String(value) }
    if (t === 'undefined')
      return { __unagent_type: 'undefined' }
    if (t === 'symbol')
      return { __unagent_type: 'symbol', value: String(value) }
    if (t === 'function') {
      const fn = value as (...args: unknown[]) => unknown
      return { __unagent_type: 'function', value: fn.name || 'anonymous' }
    }

    // Objects
    const obj = value as any
    if (seen.has(obj))
      return { __unagent_type: 'circular', id: seen.get(obj) }
    seen.set(obj, nextId++)

    try {
      if (obj instanceof Date) {
        let iso = ''
        try {
          iso = obj.toISOString()
        }
        catch {
          iso = ''
        }
        return { __unagent_type: 'Date', value: iso }
      }

      if (obj instanceof RegExp)
        return { __unagent_type: 'RegExp', value: obj.toString() }

      if (obj instanceof Uint8Array)
        return { __unagent_type: 'bytes', encoding: 'base64', value: base64FromBytes(obj) }

      if (obj instanceof Map) {
        const entries = Array.from(obj.entries()).map(([k, v]) => {
          return { k: normalize(k), v: normalize(v), _ks: stableStringify(k) }
        })
        entries.sort((a, b) => a._ks.localeCompare(b._ks))
        return { __unagent_type: 'Map', value: entries.map(e => [e.k, e.v]) }
      }

      if (obj instanceof Set) {
        const items = Array.from(obj.values()).map((v) => {
          return { v: normalize(v), _ks: stableStringify(v) }
        })
        items.sort((a, b) => a._ks.localeCompare(b._ks))
        return { __unagent_type: 'Set', value: items.map(i => i.v) }
      }

      if (Array.isArray(obj))
        return obj.map(v => normalize(v))

      if (obj instanceof Error) {
        return {
          __unagent_type: 'Error',
          name: obj.name,
          message: obj.message,
        }
      }

      const out: Record<string, any> = {}
      for (const key of Object.keys(obj).sort())
        out[key] = normalize(obj[key])
      return out
    }
    catch {
      return { __unagent_type: 'unknown', value: Object.prototype.toString.call(obj) }
    }
  }

  try {
    return JSON.stringify(normalize(input))
  }
  catch {
    return JSON.stringify({ __unagent_type: 'unstringifiable' })
  }
}

export function createTaskRunner(options: TaskRunnerOptions): TaskRunner {
  const { tasks } = options

  // Normalize scheduledTasks: ensure all values are string[]
  const scheduledTasks: Record<string, string[]> = {}
  if (options.scheduledTasks) {
    for (const [cron, names] of Object.entries(options.scheduledTasks))
      scheduledTasks[cron] = Array.isArray(names) ? names : [names]
  }

  // Cache for resolved lazy tasks
  const resolved = new Map<string, Task>()

  // Concurrent dedup: same task+payload returns same promise
  const running = new Map<string, Promise<TaskResult>>()

  async function resolveTask(name: string): Promise<Task> {
    const entry = tasks[name]
    if (!entry)
      throw new TaskError(`Task "${name}" is not registered`)
    if (!isLazy(entry))
      return entry
    const cached = resolved.get(name)
    if (cached)
      return cached
    const task = await entry.resolve()
    resolved.set(name, task)
    return task
  }

  function runTask(name: string, options: RunTaskOptions = {}): Promise<TaskResult> {
    if (!tasks[name])
      throw new TaskError(`Task "${name}" is not registered`)

    const doDedupe = options.dedupe !== false
    let key: string | undefined
    if (doDedupe) {
      if (options.dedupeKey != null) {
        key = `${name}:${options.dedupeKey}`
      }
      else {
        const payloadKey = stableStringify(options.payload ?? {})
        if (options.dedupeContext) {
          const contextKey = stableStringify(options.context ?? {})
          key = `${name}:${payloadKey}:${contextKey}`
        }
        else {
          key = `${name}:${payloadKey}`
        }
      }
      const existing = running.get(key)
      if (existing)
        return existing
    }

    const promise = resolveTask(name).then(task => task.run({
      name,
      payload: options.payload || {},
      context: options.context || {},
    })).finally(() => {
      if (key)
        running.delete(key)
    })

    if (key)
      running.set(key, promise)
    return promise
  }

  function listTasks(): { name: string, meta?: TaskMeta }[] {
    return Object.entries(tasks).map(([name, entry]) => ({ name, meta: entry.meta }))
  }

  function getCronTasks(cron: string): string[] {
    return scheduledTasks[cron] || []
  }

  function runCronTasks(cron: string, options: RunCronTasksOptions = {}): Promise<TaskResult[]> {
    const names = getCronTasks(cron)
    if (!names.length && options.onMissing === 'noop')
      return Promise.resolve([])
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
