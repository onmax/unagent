import type { VectorConfigValidationIssue, VectorConfigValidationResult } from './types/common'
import type { VectorProviderOptions } from './types/index'
import type { SqliteVecProviderOptions } from './types/sqlite-vec'

function canResolve(moduleName: string): boolean {
  try {
    const resolver = (globalThis as { require?: { resolve?: (id: string) => string } }).require?.resolve
    if (!resolver)
      throw new Error('no-require-resolve')
    resolver(moduleName)
    return true
  }
  catch {
    try {
      const resolver = (import.meta as { resolve?: (id: string) => string }).resolve
      if (typeof resolver !== 'function')
        return false
      resolver(moduleName)
      return true
    }
    catch {
      return false
    }
  }
}

function sqliteVecValidation(provider: SqliteVecProviderOptions): VectorConfigValidationIssue[] {
  const issues: VectorConfigValidationIssue[] = []
  if (!provider.embeddings) {
    issues.push({
      code: 'SQLITE_VEC_EMBEDDINGS_REQUIRED',
      field: 'embeddings',
      severity: 'error',
      message: '[sqlite-vec] embeddings is required',
    })
  }

  const nodeSqlite = globalThis.process?.getBuiltinModule?.('node:sqlite') as unknown
  if (!nodeSqlite) {
    issues.push({
      code: 'SQLITE_VEC_RUNTIME_UNSUPPORTED',
      field: 'runtime',
      severity: 'error',
      message: '[sqlite-vec] node:sqlite runtime is required (Node.js >= 22.5)',
    })
  }

  if (!canResolve('sqlite-vec')) {
    issues.push({
      code: 'SQLITE_VEC_PACKAGE_MISSING',
      field: 'package',
      severity: 'error',
      message: '[sqlite-vec] sqlite-vec package is required. Install it to use this provider.',
    })
  }

  return issues
}

export function validateVectorConfig(provider: VectorProviderOptions): VectorConfigValidationResult {
  const issues: VectorConfigValidationIssue[] = []

  if (provider.name === 'sqlite-vec')
    issues.push(...sqliteVecValidation(provider))

  return {
    provider: provider.name,
    ok: issues.every(issue => issue.severity !== 'error'),
    issues,
  }
}
