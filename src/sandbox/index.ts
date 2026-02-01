import { accessSync } from 'node:fs'
import { createRequire } from 'node:module'

export type SandboxProvider = 'vercel' | 'cloudflare'
export type SandboxType = 'docker' | 'cloudflare' | 'vercel' | 'none'

export interface SandboxOptions {
  provider: SandboxProvider
  runtime?: string
  timeout?: number
  memory?: number
  cpu?: number
}

export interface SandboxExecResult {
  ok: boolean
  stdout: string
  stderr: string
  code: number | null
}

export interface Sandbox {
  id: string
  provider: SandboxProvider
  exec: (command: string, args: string[]) => Promise<SandboxExecResult>
  writeFile: (path: string, content: string) => Promise<void>
  readFile: (path: string) => Promise<string>
  stop: () => Promise<void>
}

export interface SandboxDetection {
  type: SandboxType
  details?: Record<string, string>
}

export function detectSandbox(): SandboxDetection {
  if (process.env.CLOUDFLARE_WORKER || process.env.CF_PAGES)
    return { type: 'cloudflare', details: { runtime: 'workers' } }

  if (process.env.VERCEL || process.env.VERCEL_ENV)
    return { type: 'vercel', details: { env: process.env.VERCEL_ENV ?? 'unknown' } }

  if (process.env.DOCKER_CONTAINER || existsSync('/.dockerenv'))
    return { type: 'docker' }

  return { type: 'none' }
}

function existsSync(path: string): boolean {
  try {
    accessSync(path)
    return true
  }
  catch {
    return false
  }
}

const _require = createRequire(import.meta.url)

async function loadVercelSandbox(): Promise<unknown> {
  const moduleName = '@vercel/sandbox'
  try {
    return await import(/* @vite-ignore */ moduleName)
  }
  catch {
    throw new Error(`${moduleName} not installed. Add as peer dependency: pnpm add ${moduleName}`)
  }
}

async function loadCloudflareSandbox(): Promise<unknown> {
  const moduleName = '@cloudflare/sandbox'
  try {
    return await import(/* @vite-ignore */ moduleName)
  }
  catch {
    throw new Error(`${moduleName} not installed. Add as peer dependency.`)
  }
}

interface SandboxInstance {
  exec?: (command: string, args: string[]) => Promise<{ exitCode: number, stdout?: string, stderr?: string }>
  run?: (cmd: string) => Promise<{ exitCode: number, stdout?: string, stderr?: string }>
  writeFile: (path: string, content: string) => Promise<void>
  readFile: (path: string) => Promise<string>
  close?: () => Promise<void>
}

interface SandboxSDK {
  createSandbox: (options: Record<string, unknown>) => Promise<SandboxInstance>
}

class VercelSandbox implements Sandbox {
  id: string
  provider: SandboxProvider = 'vercel'
  private instance: SandboxInstance

  constructor(id: string, instance: SandboxInstance) {
    this.id = id
    this.instance = instance
  }

  async exec(command: string, args: string[]): Promise<SandboxExecResult> {
    const result = await this.instance.exec!(command, args)
    return { ok: result.exitCode === 0, stdout: result.stdout ?? '', stderr: result.stderr ?? '', code: result.exitCode }
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.instance.writeFile(path, content)
  }

  async readFile(path: string): Promise<string> {
    return await this.instance.readFile(path)
  }

  async stop(): Promise<void> {
    await this.instance.close?.()
  }
}

function shellQuote(arg: string): string {
  if (!/[^\w\-./=]/.test(arg))
    return arg
  return `'${arg.replace(/'/g, `'\\''`)}'`
}

class CloudflareSandbox implements Sandbox {
  id: string
  provider: SandboxProvider = 'cloudflare'
  private instance: SandboxInstance

  constructor(id: string, instance: SandboxInstance) {
    this.id = id
    this.instance = instance
  }

  async exec(command: string, args: string[]): Promise<SandboxExecResult> {
    const quotedArgs = args.map(shellQuote).join(' ')
    const result = await this.instance.run!(`${shellQuote(command)} ${quotedArgs}`)
    return { ok: result.exitCode === 0, stdout: result.stdout ?? '', stderr: result.stderr ?? '', code: result.exitCode }
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.instance.writeFile(path, content)
  }

  async readFile(path: string): Promise<string> {
    return await this.instance.readFile(path)
  }

  async stop(): Promise<void> {
    await this.instance.close?.()
  }
}

export async function createSandbox(options: SandboxOptions): Promise<Sandbox> {
  const { provider, runtime, timeout, memory, cpu } = options
  const id = `${provider}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  if (provider === 'vercel') {
    const sdk = await loadVercelSandbox() as SandboxSDK
    const instance = await sdk.createSandbox({
      runtime: runtime ?? 'node24',
      timeout: timeout ?? 300_000,
      ...(memory && { memory }),
      ...(cpu && { cpu }),
    })
    return new VercelSandbox(id, instance)
  }

  if (provider === 'cloudflare') {
    const sdk = await loadCloudflareSandbox() as SandboxSDK
    const instance = await sdk.createSandbox({
      runtime: runtime ?? 'python',
      timeout: timeout ?? 600_000,
    })
    return new CloudflareSandbox(id, instance)
  }

  throw new Error(`Unknown sandbox provider: ${provider}`)
}

export function isSandboxAvailable(provider: SandboxProvider): boolean {
  try {
    if (provider === 'vercel') {
      _require.resolve('@vercel/sandbox')
      return true
    }
    if (provider === 'cloudflare') {
      _require.resolve('@cloudflare/sandbox')
      return true
    }
    return false
  }
  catch {
    return false
  }
}
