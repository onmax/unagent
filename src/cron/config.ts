export interface CronDefinition {
  cron: string
  path: string
  description?: string
}

export function defineCronSchedules(schedules: CronDefinition[]): CronDefinition[] {
  return schedules
}

export function toCloudflareCrons(schedules: CronDefinition[]): string[] {
  return schedules.map(s => s.cron)
}

export function toVercelCrons(schedules: CronDefinition[]): { path: string, schedule: string }[] {
  return schedules.map(s => ({ path: s.path, schedule: s.cron }))
}
