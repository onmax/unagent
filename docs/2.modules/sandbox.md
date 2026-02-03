---
icon: i-lucide-box
---

# sandbox

Create sandboxed execution environments with a unified API.

```ts
import { createSandbox } from 'unagent/sandbox'
```

## Installation

Install `unagent` and the provider SDK for your platform:

::code-group
```bash [Vercel]
pnpm add unagent @vercel/sandbox
```
```bash [Cloudflare]
pnpm add unagent @cloudflare/sandbox
```
::

## Usage

### Vercel

```ts
const sandbox = await createSandbox({
  provider: {
    name: 'vercel',
    runtime: 'node24',
    timeout: 300_000,
  },
})

const result = await sandbox.exec('node', ['-e', 'console.log("hello")'])
console.log(result.stdout) // "hello"

await sandbox.stop()
```

### Cloudflare Workers

Cloudflare requires a Durable Objects binding and explicit `getSandbox` import:

```ts
import { getSandbox, Sandbox } from '@cloudflare/sandbox'
import { createSandbox } from 'unagent/sandbox'

export { Sandbox }

export default {
  async fetch(req: Request, env: Env) {
    const sandbox = await createSandbox({
      provider: {
        name: 'cloudflare',
        namespace: env.SANDBOX,
        getSandbox,
      },
    })

    const result = await sandbox.exec('echo', ['hello'])
    await sandbox.stop()

    return Response.json(result)
  },
}
```

## Options

### Vercel

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `'vercel'` | - | Provider name |
| `runtime` | `string` | `'node24'` | Node.js runtime version |
| `timeout` | `number` | `300000` | Timeout in ms |
| `cpu` | `number` | - | vCPU count |

### Cloudflare

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `'cloudflare'` | - | Provider name |
| `namespace` | `DurableObjectNamespace` | - | DO binding (required) |
| `getSandbox` | `function` | - | Import from `@cloudflare/sandbox` |
| `sandboxId` | `string` | auto | Custom sandbox ID |
| `cloudflare` | `object` | - | SDK options (`sleepAfter`, `keepAlive`) |

## Sandbox Interface

```ts
interface Sandbox {
  id: string
  provider: 'vercel' | 'cloudflare'
  exec: (command: string, args: string[]) => Promise<SandboxExecResult>
  writeFile: (path: string, content: string) => Promise<void>
  readFile: (path: string) => Promise<string>
  stop: () => Promise<void>
}

interface SandboxExecResult {
  ok: boolean
  stdout: string
  stderr: string
  code: number | null
}
```

## Example: Code Execution

```ts
import { createSandbox } from 'unagent/sandbox'

async function runCode(code: string) {
  const sandbox = await createSandbox({
    provider: { name: 'vercel', timeout: 30_000 },
  })

  try {
    await sandbox.writeFile('/app/code.js', code)
    return await sandbox.exec('node', ['/app/code.js'])
  }
  finally {
    await sandbox.stop()
  }
}
```
