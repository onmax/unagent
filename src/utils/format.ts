export function formatList(items: string[], maxShow: number = 3): string {
  if (items.length === 0)
    return ''
  if (items.length <= maxShow)
    return items.join(', ')

  const shown = items.slice(0, maxShow)
  const remaining = items.length - maxShow
  return `${shown.join(', ')} +${remaining} more`
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`)
}

export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength)
    return str
  return str.slice(0, maxLength - suffix.length) + suffix
}
