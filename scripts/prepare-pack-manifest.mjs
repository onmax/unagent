import { existsSync } from 'node:fs'
import { copyFile, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parse as parseYAML } from 'yaml'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const packagePath = join(rootDir, 'package.json')
const backupPath = join(rootDir, '.package.pack-backup.json')
const workspacePath = join(rootDir, 'pnpm-workspace.yaml')

const packageJson = JSON.parse(await readFile(packagePath, 'utf8'))
const workspaceYaml = parseYAML(await readFile(workspacePath, 'utf8')) || {}

const defaultCatalog = workspaceYaml.catalog || {}
const namedCatalogs = workspaceYaml.catalogs || {}

function resolveCatalogVersion(name, specifier) {
  if (typeof specifier !== 'string' || !specifier.startsWith('catalog:')) {
    return specifier
  }

  const catalogName = specifier.slice('catalog:'.length)
  const catalog = catalogName ? namedCatalogs[catalogName] : defaultCatalog

  if (!catalog || typeof catalog !== 'object') {
    throw new Error(`Missing catalog '${catalogName || '<default>'}' for ${name}`)
  }

  const resolved = catalog[name]
  if (!resolved) {
    throw new Error(`Missing version mapping for ${name} in catalog '${catalogName || '<default>'}'`)
  }

  return resolved
}

function resolveSection(sectionName) {
  const section = packageJson[sectionName]
  if (!section || typeof section !== 'object') {
    return false
  }

  let changed = false
  for (const [name, specifier] of Object.entries(section)) {
    const resolved = resolveCatalogVersion(name, specifier)
    if (resolved !== specifier) {
      section[name] = resolved
      changed = true
    }
  }

  return changed
}

const changed = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
].map(resolveSection).some(Boolean)

if (!changed) {
  if (existsSync(backupPath)) {
    await rm(backupPath)
  }
  console.log('[prepack] No catalog specifiers found in package.json')
  process.exit(0)
}

await copyFile(packagePath, backupPath)
await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8')
console.log('[prepack] Replaced catalog:* specifiers with concrete versions for packaging')
