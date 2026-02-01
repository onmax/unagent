import type { ParsedSkill } from './parse'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

const NAME_PATTERN = /^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/

export function validateSkill(skill: ParsedSkill, dirName?: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const { frontmatter, content } = skill

  // name: required, 1-64 chars, lowercase + hyphens only, no --, no leading/trailing -
  if (!frontmatter.name) {
    errors.push('name is required')
  }
  else {
    const name = frontmatter.name
    if (name.length < 1 || name.length > 64) {
      errors.push('name must be 1-64 characters')
    }
    if (!NAME_PATTERN.test(name)) {
      errors.push('name must be lowercase letters, numbers, and hyphens; cannot start/end with hyphen')
    }
    if (name.includes('--')) {
      errors.push('name cannot contain consecutive hyphens')
    }
    if (dirName && name !== dirName) {
      errors.push(`name "${name}" must match directory name "${dirName}"`)
    }
  }

  // description: required, 1-1024 chars
  if (!frontmatter.description) {
    errors.push('description is required')
  }
  else if (frontmatter.description.length < 1 || frontmatter.description.length > 1024) {
    errors.push('description must be 1-1024 characters')
  }

  // compatibility: max 500 chars if present
  if (frontmatter.compatibility && frontmatter.compatibility.length > 500) {
    errors.push('compatibility must be max 500 characters')
  }

  // content should not be empty
  if (!content) {
    warnings.push('skill content is empty')
  }

  return { valid: errors.length === 0, errors, warnings }
}
