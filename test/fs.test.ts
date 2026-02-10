import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { describe, expect, it } from 'vitest'
import { createFSFromStorage, InMemoryFS, OverlayFS, RealFS } from '../src/fs'

describe('fs', () => {
  describe('inMemoryFS', () => {
    it('writes and reads file', async () => {
      const fs = new InMemoryFS()
      await fs.writeFile('/test.txt', 'hello')
      expect(await fs.readFile('/test.txt')).toBe('hello')
    })

    it('throws on read non-existent file', async () => {
      const fs = new InMemoryFS()
      await expect(fs.readFile('/missing.txt')).rejects.toThrow('ENOENT')
    })

    it('checks file existence', async () => {
      const fs = new InMemoryFS()
      await fs.writeFile('/test.txt', 'hello')
      expect(await fs.exists('/test.txt')).toBe(true)
      expect(await fs.exists('/missing.txt')).toBe(false)
    })

    it('creates and lists directories', async () => {
      const fs = new InMemoryFS()
      await fs.mkdir('/dir')
      await fs.writeFile('/dir/file.txt', 'content')
      const entries = await fs.readdir('/dir')
      expect(entries).toContain('file.txt')
    })

    it('creates directories recursively', async () => {
      const fs = new InMemoryFS()
      await fs.mkdir('/a/b/c', { recursive: true })
      expect(await fs.exists('/a/b/c')).toBe(true)
    })

    it('removes file', async () => {
      const fs = new InMemoryFS()
      await fs.writeFile('/test.txt', 'hello')
      await fs.rm('/test.txt')
      expect(await fs.exists('/test.txt')).toBe(false)
    })

    it('removes directory recursively', async () => {
      const fs = new InMemoryFS()
      await fs.mkdir('/dir')
      await fs.writeFile('/dir/file.txt', 'content')
      await fs.rm('/dir', { recursive: true })
      expect(await fs.exists('/dir')).toBe(false)
    })

    it('returns file stats', async () => {
      const fs = new InMemoryFS()
      await fs.writeFile('/test.txt', 'hello')
      const stat = await fs.stat('/test.txt')
      expect(stat.isFile).toBe(true)
      expect(stat.size).toBe(5)
    })

    it('returns directory stats', async () => {
      const fs = new InMemoryFS()
      await fs.mkdir('/dir')
      const stat = await fs.stat('/dir')
      expect(stat.isDirectory).toBe(true)
    })
  })

  describe('overlayFS', () => {
    it('reads from base when overlay empty', async () => {
      const base = new InMemoryFS()
      await base.writeFile('/test.txt', 'base-content')

      const overlay = new OverlayFS(base)
      expect(await overlay.readFile('/test.txt')).toBe('base-content')
    })

    it('writes to overlay preserving base', async () => {
      const base = new InMemoryFS()
      await base.writeFile('/test.txt', 'base-content')

      const overlay = new OverlayFS(base)
      await overlay.writeFile('/test.txt', 'overlay-content')

      expect(await overlay.readFile('/test.txt')).toBe('overlay-content')
      expect(await base.readFile('/test.txt')).toBe('base-content')
    })

    it('marks files as deleted', async () => {
      const base = new InMemoryFS()
      await base.writeFile('/test.txt', 'content')

      const overlay = new OverlayFS(base)
      await overlay.rm('/test.txt')

      expect(await overlay.exists('/test.txt')).toBe(false)
      expect(await base.exists('/test.txt')).toBe(true)
    })

    it('merges readdir from base and overlay', async () => {
      const base = new InMemoryFS()
      await base.mkdir('/dir')
      await base.writeFile('/dir/base.txt', 'base')

      const overlay = new OverlayFS(base)
      await overlay.writeFile('/dir/overlay.txt', 'overlay')

      const entries = await overlay.readdir('/dir')
      expect(entries).toContain('base.txt')
      expect(entries).toContain('overlay.txt')
    })

    it('stat falls back to base', async () => {
      const base = new InMemoryFS()
      await base.writeFile('/test.txt', 'content')

      const overlay = new OverlayFS(base)
      const stat = await overlay.stat('/test.txt')
      expect(stat.isFile).toBe(true)
    })
  })

  describe('createFSFromStorage', () => {
    it('creates fs from storage interface', async () => {
      const storage = new Map<string, string>()
      const fs = createFSFromStorage({
        getItem: key => storage.get(key) ?? null,
        setItem: (key, value) => { storage.set(key, value) },
        removeItem: (key) => { storage.delete(key) },
        getKeys: () => [...storage.keys()],
      })

      await fs.writeFile('/test.txt', 'hello')
      expect(await fs.readFile('/test.txt')).toBe('hello')
    })

    it('throws on missing file', async () => {
      const fs = createFSFromStorage({
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        getKeys: () => [],
      })

      await expect(fs.readFile('/missing.txt')).rejects.toThrow('ENOENT')
    })
  })

  describe('realFS', () => {
    it('blocks prefix-based traversal (base is a prefix of sibling dir)', async () => {
      const root = mkdtempSync(join(tmpdir(), 'unagent-realfs-'))
      const baseDir = join(root, 'bar')
      const sibling = join(root, 'barbaz')
      mkdirSync(baseDir, { recursive: true })
      mkdirSync(sibling, { recursive: true })
      writeFileSync(join(sibling, 'secret.txt'), 'nope')

      try {
        const fs = new RealFS(baseDir)
        await expect(fs.readFile('../barbaz/secret.txt')).rejects.toThrow('EACCES')
      }
      finally {
        rmSync(root, { recursive: true, force: true })
      }
    })
  })
})
