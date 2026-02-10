import { defineEventHandler } from 'h3'
import { runner } from '~/server/_shared/task'

export default defineEventHandler(() => {
  return { tasks: runner.listTasks(), scheduledTasks: runner.scheduledTasks }
})
