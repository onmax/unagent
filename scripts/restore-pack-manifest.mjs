import { existsSync } from 'node:fs'
import { copyFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const packagePath = join(rootDir, 'package.json')
const backupPath = join(rootDir, '.package.pack-backup.json')

if (!existsSync(backupPath)) {
  console.log('[postpack] No backup manifest found, skipping restore')
  process.exit(0)
}

await copyFile(backupPath, packagePath)
await rm(backupPath)
console.log('[postpack] Restored package.json after packaging')
