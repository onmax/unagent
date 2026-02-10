import { runner } from '~/_shared/task'

export default defineEventHandler(async (event) => {
  const { name, payload } = await readBody<{ name: string, payload?: Record<string, unknown> }>(event)
  if (!name)
    throw createError({ statusCode: 400, statusMessage: 'Missing task name' })
  const result = await runner.runTask(name, { payload })
  return result
})
