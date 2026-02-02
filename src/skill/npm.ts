import type { DiscoveredSkill } from './discover'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'pathe'
import { discoverSkills } from './discover'

export interface NpmSkillPackage {
  /** Package name (e.g., '@nuxt/ui' or 'nuxt-content') */
  packageName: string
  /** Path to the skills directory in node_modules */
  skillsDir: string
  /** Discovered skills in the package */
  skills: DiscoveredSkill[]
}

/**
 * Discover skills bundled in node_modules packages.
 *
 * Scans for packages with a skills/ directory containing SKILL.md files.
 * Follows the antfu/skills-npm convention.
 *
 * @param cwd - Project root directory containing node_modules
 * @returns Array of packages with bundled skills
 */
export function discoverSkillsFromNodeModules(cwd: string): NpmSkillPackage[] {
  const nodeModulesPath = join(cwd, 'node_modules')
  if (!existsSync(nodeModulesPath))
    return []

  const result: NpmSkillPackage[] = []
  const scannedPaths = new Set<string>()

  function scanDir(dir: string, prefix = ''): void {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    }
    catch {
      return
    }

    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules')
        continue

      // Handle scoped packages (@org/pkg)
      if (entry.startsWith('@')) {
        const scopedDir = join(dir, entry)
        try {
          if (statSync(scopedDir).isDirectory())
            scanDir(scopedDir, `${entry}/`)
        }
        catch { /* skip unreadable */ }
        continue
      }

      const pkgDir = join(dir, entry)
      const pkgName = `${prefix}${entry}`

      if (scannedPaths.has(pkgDir))
        continue
      scannedPaths.add(pkgDir)

      const skillsDir = join(pkgDir, 'skills')
      try {
        if (statSync(skillsDir).isDirectory()) {
          const discovered = discoverSkills(skillsDir, { recursive: true })
          if (discovered.length > 0) {
            result.push({ packageName: pkgName, skillsDir, skills: discovered })
          }
        }
      }
      catch { /* skip if no skills dir or unreadable */ }
    }
  }

  scanDir(nodeModulesPath)
  return result
}

/**
 * Get skill names from discovered npm packages
 */
export function getNpmSkillNames(packages: NpmSkillPackage[]): string[] {
  return packages.flatMap(pkg => pkg.skills.map(s => s.name))
}

export interface BundledSkillSource {
  /** Path to skills directory in node_modules */
  source: string
  /** Skill names in this package */
  skills: string[]
  /** Package name (e.g., '@nuxt/ui') */
  packageName: string
}

/**
 * Get bundled skills as SkillSource-compatible objects for batch install.
 */
export function getBundledSkillSources(cwd: string): BundledSkillSource[] {
  return discoverSkillsFromNodeModules(cwd).map(pkg => ({
    source: pkg.skillsDir,
    skills: pkg.skills.map(s => s.name),
    packageName: pkg.packageName,
  }))
}
