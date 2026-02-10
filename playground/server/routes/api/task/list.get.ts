import { runner } from '~/_shared/task'

export default defineEventHandler(() => {
  return { tasks: runner.listTasks(), scheduledTasks: runner.scheduledTasks }
})
