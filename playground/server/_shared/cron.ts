import type { H3Event } from 'h3'

export type CronProvider = 'memory'

interface Schedule {
  id: string
  cron: string
  destination?: string
  active: boolean
  createdAt: string
}

const supports = Object.freeze({
  create: true,
  list: true,
  get: true,
  delete: true,
  pause: true,
  resume: true,
})

const store = new Map<string, Schedule>()
let nextId = 1

export async function createPlaygroundCron(_event: H3Event, _provider: CronProvider): Promise<{ provider: CronProvider, cron: any }> {
  return {
    provider: 'memory',
    cron: {
      supports,
      async create(input: any): Promise<Schedule> {
        const schedule: Schedule = {
          id: String(nextId++),
          cron: String(input?.cron || ''),
          destination: input?.destination ? String(input.destination) : undefined,
          active: true,
          createdAt: new Date().toISOString(),
        }
        store.set(schedule.id, schedule)
        return schedule
      },
      async list(): Promise<Schedule[]> {
        return Array.from(store.values())
      },
      async get(id: string): Promise<Schedule | null> {
        return store.get(id) || null
      },
      async delete(id: string): Promise<void> {
        store.delete(id)
      },
      async pause(id: string): Promise<void> {
        const s = store.get(id)
        if (s)
          store.set(id, { ...s, active: false })
      },
      async resume(id: string): Promise<void> {
        const s = store.get(id)
        if (s)
          store.set(id, { ...s, active: true })
      },
    },
  }
}
