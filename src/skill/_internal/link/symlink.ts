import { existsSync, lstatSync, mkdirSync, symlinkSync, unlinkSync } from 'node:fs'
import { dirname, relative } from 'pathe'
import { validateSymlinkTarget } from './sanitize'

export interface SymlinkOptions {
  force?: boolean
  relative?: boolean
}

export interface SymlinkResult {
  success: boolean
  path: string
  target: string
  error?: string
}

export function createSymlink(target: string, linkPath: string, options: SymlinkOptions = {}): SymlinkResult {
  const { force = false, relative: useRelative = true } = options

  if (!validateSymlinkTarget(target)) {
    return { success: false, path: linkPath, target, error: 'Invalid symlink target' }
  }

  if (!existsSync(target)) {
    return { success: false, path: linkPath, target, error: 'Target does not exist' }
  }

  try {
    const linkDir = dirname(linkPath)
    if (!existsSync(linkDir)) {
      mkdirSync(linkDir, { recursive: true })
    }

    if (existsSync(linkPath)) {
      if (!force) {
        return { success: false, path: linkPath, target, error: 'Link already exists' }
      }
      const stat = lstatSync(linkPath)
      if (stat.isSymbolicLink() || stat.isFile()) {
        unlinkSync(linkPath)
      }
      else {
        return { success: false, path: linkPath, target, error: 'Cannot overwrite directory' }
      }
    }

    const symlinkTarget = useRelative ? relative(linkDir, target) : target

    // On Windows, use junction for directories
    const targetStat = lstatSync(target)
    const type = process.platform === 'win32' && targetStat.isDirectory() ? 'junction' : undefined

    symlinkSync(symlinkTarget, linkPath, type)

    return { success: true, path: linkPath, target }
  }
  catch (error) {
    return {
      success: false,
      path: linkPath,
      target,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export function isSymlink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink()
  }
  catch {
    return false
  }
}

export function removeSymlink(linkPath: string): boolean {
  try {
    if (!isSymlink(linkPath))
      return false
    unlinkSync(linkPath)
    return true
  }
  catch {
    return false
  }
}
