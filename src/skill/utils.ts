import type { DetectedAgent } from '../env/detect'
import { detectInstalledAgents } from '../env/detect'

/**
 * Extract unique skill names from an array of items with optional skills array.
 */
export function extractSkillNames(items: Array<{ skills?: string[] }>): string[] {
  const names = items.flatMap(i => i.skills ?? [])
  return [...new Set(names)]
}

/**
 * Format skill names for display, returning 'all' for items without specific skills.
 */
export function formatSkillNames(items: Array<{ skills?: string[] }>): string {
  return items.flatMap(i => i.skills?.length ? i.skills : ['all']).join(', ')
}

/**
 * Get display-friendly names of detected agents (e.g., "Claude Code (claude)")
 */
export function getAgentDisplayNames(agents?: DetectedAgent[]): string[] {
  return (agents ?? detectInstalledAgents()).map(a => `${a.config.name} (${a.id})`)
}

/**
 * Get detected agent IDs as comma-separated string
 */
export function formatDetectedAgentIds(agents?: DetectedAgent[]): string {
  return (agents ?? detectInstalledAgents()).map(a => a.id).join(', ')
}
