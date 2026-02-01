import * as nodeFs from 'node:fs/promises'
import { dirname, join, normalize } from 'pathe'

export interface FileStat {
  size: number
  isFile: boolean
  isDirectory: boolean
  mtime?: Date
}

function ensureLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

export interface VirtualFS {
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, content: string) => Promise<void>
  exists: (path: string) => Promise<boolean>
  readdir: (path: string) => Promise<string[]>
  mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>
  rm: (path: string, options?: { recursive?: boolean }) => Promise<void>
  stat: (path: string) => Promise<FileStat>
}

export class InMemoryFS implements VirtualFS {
  private files = new Map<string, string>()
  private dirs = new Set<string>(['/'])

  private normalizePath(path: string): string {
    return ensureLeadingSlash(path)
  }

  async readFile(path: string): Promise<string> {
    const p = this.normalizePath(path)
    const content = this.files.get(p)
    if (content === undefined)
      throw new Error(`ENOENT: no such file: ${p}`)
    return content
  }

  async writeFile(path: string, content: string): Promise<void> {
    const p = this.normalizePath(path)
    const dir = dirname(p)
    if (dir !== '/' && !this.dirs.has(dir))
      throw new Error(`ENOENT: no such directory: ${dir}`)
    this.files.set(p, content)
  }

  async exists(path: string): Promise<boolean> {
    const p = this.normalizePath(path)
    return this.files.has(p) || this.dirs.has(p)
  }

  async readdir(path: string): Promise<string[]> {
    const p = this.normalizePath(path)
    if (!this.dirs.has(p))
      throw new Error(`ENOENT: no such directory: ${p}`)

    const entries = new Set<string>()
    const prefix = p === '/' ? '/' : `${p}/`

    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) {
        const relative = filePath.slice(prefix.length)
        const name = relative.split('/')[0]
        if (name)
          entries.add(name)
      }
    }
    for (const dirPath of this.dirs) {
      if (dirPath.startsWith(prefix) && dirPath !== p) {
        const relative = dirPath.slice(prefix.length)
        const name = relative.split('/')[0]
        if (name)
          entries.add(name)
      }
    }

    return [...entries]
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    const p = this.normalizePath(path)
    if (this.dirs.has(p))
      return

    if (options?.recursive) {
      const parts = p.split('/').filter(Boolean)
      let current = ''
      for (const part of parts) {
        current += `/${part}`
        this.dirs.add(current)
      }
    }
    else {
      const parent = dirname(p)
      if (parent !== '/' && !this.dirs.has(parent))
        throw new Error(`ENOENT: no such directory: ${parent}`)
      this.dirs.add(p)
    }
  }

  async rm(path: string, options?: { recursive?: boolean }): Promise<void> {
    const p = this.normalizePath(path)

    if (this.files.has(p)) {
      this.files.delete(p)
      return
    }

    if (!this.dirs.has(p))
      throw new Error(`ENOENT: no such file or directory: ${p}`)

    const prefix = p === '/' ? '/' : `${p}/`
    const hasChildren = [...this.files.keys()].some(f => f.startsWith(prefix))
      || [...this.dirs].some(d => d.startsWith(prefix) && d !== p)

    if (hasChildren && !options?.recursive)
      throw new Error(`ENOTEMPTY: directory not empty: ${p}`)

    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix))
        this.files.delete(filePath)
    }
    for (const dirPath of this.dirs) {
      if (dirPath.startsWith(prefix) || dirPath === p)
        this.dirs.delete(dirPath)
    }
  }

  async stat(path: string): Promise<FileStat> {
    const p = this.normalizePath(path)
    if (this.files.has(p)) {
      return { size: this.files.get(p)!.length, isFile: true, isDirectory: false }
    }
    if (this.dirs.has(p)) {
      return { size: 0, isFile: false, isDirectory: true }
    }
    throw new Error(`ENOENT: no such file or directory: ${p}`)
  }
}

export class OverlayFS implements VirtualFS {
  private overlay: InMemoryFS
  private deleted = new Set<string>()

  constructor(private base: VirtualFS) {
    this.overlay = new InMemoryFS()
  }

  private normalizePath(path: string): string {
    return ensureLeadingSlash(path)
  }

  async readFile(path: string): Promise<string> {
    const p = this.normalizePath(path)
    if (this.deleted.has(p))
      throw new Error(`ENOENT: no such file: ${p}`)
    try {
      return await this.overlay.readFile(p)
    }
    catch {
      return await this.base.readFile(p)
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    const p = this.normalizePath(path)
    this.deleted.delete(p)
    const dir = dirname(p)
    if (dir !== '/') {
      try {
        await this.overlay.mkdir(dir, { recursive: true })
      }
      catch {}
    }
    await this.overlay.writeFile(p, content)
  }

  async exists(path: string): Promise<boolean> {
    const p = this.normalizePath(path)
    if (this.deleted.has(p))
      return false
    if (await this.overlay.exists(p))
      return true
    return await this.base.exists(p)
  }

  async readdir(path: string): Promise<string[]> {
    const p = this.normalizePath(path)
    const entries = new Set<string>()

    try {
      for (const e of await this.base.readdir(p))
        entries.add(e)
    }
    catch {}

    try {
      for (const e of await this.overlay.readdir(p))
        entries.add(e)
    }
    catch {}

    for (const deleted of this.deleted) {
      const prefix = p === '/' ? '/' : `${p}/`
      if (deleted.startsWith(prefix)) {
        const name = deleted.slice(prefix.length).split('/')[0]
        if (name && !deleted.slice(prefix.length).includes('/'))
          entries.delete(name)
      }
    }

    return [...entries]
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    const p = this.normalizePath(path)
    this.deleted.delete(p)
    await this.overlay.mkdir(p, options)
  }

  async rm(path: string, options?: { recursive?: boolean }): Promise<void> {
    const p = this.normalizePath(path)
    try {
      await this.overlay.rm(p, options)
    }
    catch {}
    this.deleted.add(p)
    if (options?.recursive) {
      const prefix = p === '/' ? '/' : `${p}/`
      for (const deleted of [...this.deleted]) {
        if (deleted.startsWith(prefix))
          this.deleted.add(deleted)
      }
    }
  }

  async stat(path: string): Promise<FileStat> {
    const p = this.normalizePath(path)
    if (this.deleted.has(p))
      throw new Error(`ENOENT: no such file or directory: ${p}`)
    try {
      return await this.overlay.stat(p)
    }
    catch {
      return await this.base.stat(p)
    }
  }
}

export class RealFS implements VirtualFS {
  private normalizedBase: string

  constructor(private basePath: string = '/') {
    this.normalizedBase = normalize(basePath)
  }

  private resolve(path: string): string {
    const resolved = normalize(join(this.basePath, path))
    // Prevent path traversal attacks
    if (!resolved.startsWith(this.normalizedBase) && resolved !== this.normalizedBase)
      throw new Error(`EACCES: path traversal not allowed: ${path}`)
    return resolved
  }

  async readFile(path: string): Promise<string> {
    return await nodeFs.readFile(this.resolve(path), 'utf-8')
  }

  async writeFile(path: string, content: string): Promise<void> {
    await nodeFs.writeFile(this.resolve(path), content, 'utf-8')
  }

  async exists(path: string): Promise<boolean> {
    try {
      await nodeFs.access(this.resolve(path))
      return true
    }
    catch {
      return false
    }
  }

  async readdir(path: string): Promise<string[]> {
    return await nodeFs.readdir(this.resolve(path))
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await nodeFs.mkdir(this.resolve(path), options)
  }

  async rm(path: string, options?: { recursive?: boolean }): Promise<void> {
    await nodeFs.rm(this.resolve(path), options)
  }

  async stat(path: string): Promise<FileStat> {
    const stats = await nodeFs.stat(this.resolve(path))
    return { size: stats.size, isFile: stats.isFile(), isDirectory: stats.isDirectory(), mtime: stats.mtime }
  }
}

export interface Storage {
  getItem: (key: string) => Promise<string | null> | string | null
  setItem: (key: string, value: string) => Promise<void> | void
  removeItem: (key: string) => Promise<void> | void
  getKeys: (base?: string) => Promise<string[]> | string[]
}

export function createFSFromStorage(storage: Storage): VirtualFS {
  const dirs = new Set<string>(['/'])

  return {
    async readFile(path) {
      const content = await storage.getItem(path)
      if (content === null)
        throw new Error(`ENOENT: no such file: ${path}`)
      return content
    },

    async writeFile(path, content) {
      const dir = dirname(path)
      if (dir !== '/')
        dirs.add(dir)
      await storage.setItem(path, content)
    },

    async exists(path) {
      if (dirs.has(path))
        return true
      const content = await storage.getItem(path)
      return content !== null
    },

    async readdir(path) {
      const keys = await storage.getKeys(path)
      const prefix = path === '/' ? '' : path
      const entries = new Set<string>()
      for (const key of keys) {
        if (key.startsWith(prefix)) {
          const relative = key.slice(prefix.length).replace(/^\//, '')
          const name = relative.split('/')[0]
          if (name)
            entries.add(name)
        }
      }
      return [...entries]
    },

    async mkdir(path, options) {
      if (options?.recursive) {
        const parts = path.split('/').filter(Boolean)
        let current = ''
        for (const part of parts) {
          current += `/${part}`
          dirs.add(current)
        }
      }
      else {
        dirs.add(path)
      }
    },

    async rm(path) {
      await storage.removeItem(path)
      dirs.delete(path)
    },

    async stat(path) {
      if (dirs.has(path))
        return { size: 0, isFile: false, isDirectory: true }
      const content = await storage.getItem(path)
      if (content === null)
        throw new Error(`ENOENT: no such file or directory: ${path}`)
      return { size: content.length, isFile: true, isDirectory: false }
    },
  }
}
