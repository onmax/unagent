---
icon: i-lucide-box
---

# sandbox

Detect and create sandboxed execution environments.

```ts
import { createSandbox, detectSandbox, isSandboxAvailable } from 'unagent/sandbox'
```

## Sandbox Detection

### `detectSandbox()`

Detect if running in a known sandbox environment.

```ts
const detection = detectSandbox()

switch (detection.type) {
  case 'cloudflare':
    console.log('Running in Cloudflare Workers')
    break
  case 'vercel':
    console.log(`Vercel env: ${detection.details?.env}`)
    break
  case 'docker':
    console.log('Running in Docker')
    break
  case 'none':
    console.log('No sandbox detected')
}
```

Detection checks:
- **cloudflare**: `CLOUDFLARE_WORKER` or `CF_PAGES` env vars
- **vercel**: `VERCEL` or `VERCEL_ENV` env vars
- **docker**: `DOCKER_CONTAINER` env var or `/.dockerenv` file

### `isSandboxAvailable(provider)`

Check if a sandbox provider SDK is installed.

```ts
if (isSandboxAvailable('vercel')) {
  const sandbox = await createSandbox({ provider: 'vercel' })
}
```

## Creating Sandboxes

### `createSandbox(options)`

Create a sandboxed execution environment. Requires peer dependencies:
- Vercel: `@vercel/sandbox`
- Cloudflare: `@cloudflare/sandbox`

```ts
const sandbox = await createSandbox({
  provider: 'vercel',
  runtime: 'node24',
  timeout: 300_000,
  memory: 512,
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

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | `'vercel' \| 'cloudflare'` | required | Sandbox provider |
| `runtime` | `string` | `'node24'` (Vercel) / `'python'` (Cloudflare) | Runtime environment |
| `timeout` | `number` | `300000` (Vercel) / `600000` (Cloudflare) | Execution timeout ms |
| `memory` | `number` | - | Memory limit MB (Vercel only) |
| `cpu` | `number` | - | CPU limit (Vercel only) |

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
type SandboxType = 'docker' | 'cloudflare' | 'vercel' | 'none'

interface SandboxDetection {
  type: SandboxType
  details?: Record<string, string>
}

interface SandboxOptions {
  provider: SandboxProvider
  runtime?: string
  timeout?: number
  memory?: number
  cpu?: number
}
```

## Example: Code Execution Agent

```ts
import { createSandbox, isSandboxAvailable } from 'unagent/sandbox'

async function executeCode(code: string, language: 'javascript' | 'python') {
  const provider = language === 'python' ? 'cloudflare' : 'vercel'

  if (!isSandboxAvailable(provider)) {
    throw new Error(`${provider} sandbox not available`)
  }

  const sandbox = await createSandbox({
    provider,
    timeout: 30_000,
  })

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
