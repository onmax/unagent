import type { CloudflareSandboxStub, Sandbox, SandboxExecResult, SandboxProvider } from './types'

function shellQuote(arg: string): string {
  if (!/[^\w\-./=]/.test(arg))
    return arg
  return `'${arg.replace(/'/g, `'\\''`)}'`
}

export class CloudflareSandboxAdapter implements Sandbox {
  id: string
  provider: SandboxProvider = 'cloudflare'
  private stub: CloudflareSandboxStub

  constructor(id: string, stub: CloudflareSandboxStub) {
    this.id = id
    this.stub = stub
  }

  async exec(command: string, args: string[]): Promise<SandboxExecResult> {
    const cmd = args.length ? `${shellQuote(command)} ${args.map(shellQuote).join(' ')}` : shellQuote(command)
    const result = await this.stub.exec(cmd)
    return { ok: result.success, stdout: result.stdout, stderr: result.stderr, code: result.exitCode }
  }

  async writeFile(path: string, content: string): Promise<void> {
    const result = await this.stub.writeFile(path, content)
    if (!result.success)
      throw new Error(`Failed to write file: ${path}`)
  }

  async readFile(path: string): Promise<string> {
    const result = await this.stub.readFile(path)
    if (!result.success)
      throw new Error(`Failed to read file: ${path}`)
    return result.content
  }

  async stop(): Promise<void> {
    await this.stub.destroy()
  }
}
