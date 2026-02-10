import type { Task } from 'unagent/task'
import { createTaskRunner } from 'unagent/task'

const cleanupTask: Task = {
  meta: { name: 'db:cleanup', description: 'Clean up stale database records' },
  async run() {
    await new Promise(r => setTimeout(r, 200))
    return { result: { deleted: 42, ts: Date.now() } }
  },
}

const digestTask: Task = {
  meta: { name: 'email:digest', description: 'Send weekly email digest' },
  async run(event) {
    await new Promise(r => setTimeout(r, 100))
    return { result: { sent: true, to: event.payload.to || 'all', ts: Date.now() } }
  },
}

const healthTask: Task = {
  meta: { name: 'health:ping', description: 'Ping health check' },
  run() {
    return { result: { ok: true, ts: Date.now() } }
  },
}

export const runner = createTaskRunner({
  tasks: { 'db:cleanup': cleanupTask, 'email:digest': digestTask, 'health:ping': healthTask },
  scheduledTasks: { '0 */6 * * *': 'db:cleanup', '0 9 * * 1': ['email:digest'] },
})
