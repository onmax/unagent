export function toVercelCrons(scheduledTasks: Record<string, string[]>, basePath: string = '/api/cron'): { path: string, schedule: string }[] {
  const crons: { path: string, schedule: string }[] = []
  for (const [schedule, names] of Object.entries(scheduledTasks)) {
    for (const name of names)
      crons.push({ path: `${basePath}/${name}`, schedule })
  }
  return crons
}

export function toCloudflareCrons(scheduledTasks: Record<string, string[]>): string[] {
  return Object.keys(scheduledTasks)
}
