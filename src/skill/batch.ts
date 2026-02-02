import type { InstallSkillResult } from './install'
import { installSkill } from './install'

export interface SkillSource {
  /** Remote URL (github, etc) or local path */
  source: string
  /** Specific skills to install, or undefined for all */
  skills?: string[]
  /** Display label for progress messages */
  label?: string
  /** Install mode: symlink for local, copy for remote */
  mode?: 'symlink' | 'copy'
}

export interface BatchInstallCallbacks {
  onStart?: (source: SkillSource) => void
  onSuccess?: (source: SkillSource, result: InstallSkillResult) => void
  onError?: (source: SkillSource, error: string) => void
}

export interface BatchInstallResultEntry {
  source: SkillSource
  result?: InstallSkillResult
  error?: string
}

export interface BatchInstallResult {
  results: BatchInstallResultEntry[]
  totalInstalled: number
  totalErrors: number
}

/**
 * Install skills from multiple sources with progress callbacks.
 */
export async function installSkillBatch(sources: SkillSource[], callbacks?: BatchInstallCallbacks): Promise<BatchInstallResult> {
  const results: BatchInstallResultEntry[] = []
  let totalInstalled = 0
  let totalErrors = 0

  for (const source of sources) {
    callbacks?.onStart?.(source)

    try {
      const result = await installSkill({
        source: source.source,
        skills: source.skills,
        mode: source.mode ?? 'copy',
      })

      results.push({ source, result })
      totalInstalled += result.installed.length
      totalErrors += result.errors.length

      if (result.installed.length > 0)
        callbacks?.onSuccess?.(source, result)
      if (result.errors.length > 0)
        callbacks?.onError?.(source, result.errors.map(e => e.error).join(', '))
    }
    catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      results.push({ source, error: msg })
      callbacks?.onError?.(source, msg)
      totalErrors++
    }
  }

  return { results, totalInstalled, totalErrors }
}
