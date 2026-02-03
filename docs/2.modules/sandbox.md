---
icon: i-lucide-box
---

# sandbox

Create sandboxed execution environments with a minimal API.

```ts
import { createSandbox } from 'unagent/sandbox'
```

## Creating Sandboxes

### `createSandbox(options)`

Create a sandboxed execution environment. Install the provider SDK yourself:
- Vercel: `@vercel/sandbox`
- Cloudflare: `@cloudflare/sandbox`

```ts
const sandbox = await createSandbox({
  provider: {
    name: 'vercel',
    runtime: 'node24',
    timeout: 300_000,
  },
})

// Execute commands
const result = await sandbox.exec('node', ['-e', 'console.log("hello")'])
console.log(result.stdout) // "hello"

// File operations
await sandbox.writeFile('/app/index.js', 'console.log("hi")')
const content = await sandbox.readFile('/app/index.js')

// Cleanup
await sandbox.stop()
```

### Cloudflare Workers

Cloudflare requires a Durable Objects binding.

```ts
const sandbox = await createSandbox({
  provider: {
    name: 'cloudflare',
    namespace: env.SANDBOX,
    cloudflare: { sleepAfter: '10m' },
  },
})
```

### Options

`provider` can be a string (`'vercel' | 'cloudflare' | 'auto'`) or a full object.
For Cloudflare, the object form is required to pass the namespace.
If you use `'auto'`, it will only work for Cloudflare when the namespace is provided via the object form.

| Option | Type | Description |
|--------|------|-------------|
| `provider` | `'vercel' \| 'cloudflare' \| 'auto' \| ProviderOptions` | Provider selection |

#### ProviderOptions

| Name | Type | Description |
|------|------|-------------|
| `name` | `'vercel' \| 'cloudflare'` | Provider name |
| `runtime` | `string` | Vercel runtime (default: `node24`) |
| `timeout` | `number` | Vercel timeout (ms, default: `300000`) |
| `cpu` | `number` | Vercel CPU limit |
| `namespace` | `DurableObjectNamespace` | Cloudflare DO binding |
| `sandboxId` | `string` | Cloudflare sandbox id |
| `cloudflare` | `CloudflareSandboxOptions` | Cloudflare SDK options |

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

## Types

```ts
type SandboxProvider = 'vercel' | 'cloudflare'

interface VercelProviderOptions {
  name: 'vercel'
  runtime?: string
  timeout?: number
  cpu?: number
}

interface CloudflareProviderOptions {
  name: 'cloudflare'
  namespace: DurableObjectNamespace
  sandboxId?: string
  cloudflare?: CloudflareSandboxOptions
}

interface SandboxOptions {
  provider?: SandboxProvider | 'auto' | VercelProviderOptions | CloudflareProviderOptions
}
```

## Example: Code Execution Agent

```ts
import { createSandbox } from 'unagent/sandbox'

async function executeCode(code: string, language: 'javascript' | 'python') {
  const provider = language === 'python'
    ? { name: 'cloudflare', namespace: env.SANDBOX }
    : { name: 'vercel', timeout: 30_000 }

  const sandbox = await createSandbox({ provider })

  try {
    if (language === 'javascript') {
      await sandbox.writeFile('/app/code.js', code)
      return await sandbox.exec('node', ['/app/code.js'])
    }
    else {
      await sandbox.writeFile('/app/code.py', code)
      return await sandbox.exec('python', ['/app/code.py'])
    }
  }
  finally {
    await sandbox.stop()
  }
}
```
