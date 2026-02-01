import { isAbsolute, normalize, relative, resolve } from 'node:path'

export function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
}

export function isPathSafe(targetPath: string, baseDir: string): boolean {
  const resolved = resolve(baseDir, targetPath)
  const normalizedBase = normalize(baseDir)
  const normalizedTarget = normalize(resolved)

  if (!normalizedTarget.startsWith(normalizedBase)) {
    return false
  }

  const rel = relative(baseDir, resolved)
  if (rel.startsWith('..') || isAbsolute(rel)) {
    return false
  }

  const dangerous = ['..', '~', '$', '`', '|', ';', '&', '>', '<', '\\']
  if (dangerous.some(char => targetPath.includes(char))) {
    return false
  }

  return true
}

export function validateSymlinkTarget(target: string): boolean {
  if (!target || typeof target !== 'string')
    return false
  if (target.length > 4096)
    return false
  if (target.includes('\0'))
    return false
  return true
}
