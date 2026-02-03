---
icon: i-simple-icons-vercel
---

# sandbox-vercel

Vercel-specific sandbox features via the `sandbox.vercel` namespace.

## Setup

```ts
import { createSandbox } from 'unagent/sandbox'

const sandbox = await createSandbox({
  provider: { name: 'vercel', runtime: 'node24', timeout: 300_000 },
})

// Access Vercel namespace
const vercel = sandbox.vercel
```

## VercelNamespace API

### domain

Get the public URL for a port:

```ts
const url = sandbox.vercel.domain(3000)
// "https://vercel-xxx-3000.sandbox.vercel.app"
```

### getMetadata

Get sandbox metadata:

```ts
const metadata = sandbox.vercel.getMetadata()
// { id: 'vercel-xxx', runtime: 'node24', status: 'running', createdAt: '...' }
```

### native

Escape hatch to the underlying SDK instance:

```ts
const sdkInstance = sandbox.vercel.native
// Direct access to @vercel/sandbox instance
```

### Snapshots

Create and manage sandbox snapshots:

```ts
// Create snapshot
const snapshot = await sandbox.vercel.snapshot()
// { id: 'snap-xxx', sandboxId: 'vercel-xxx', createdAt: '...' }

// List snapshots
const { snapshots } = await sandbox.vercel.listSnapshots()

// Get specific snapshot
const snap = await sandbox.vercel.getSnapshot('snap-xxx')

// Delete snapshot
await sandbox.vercel.deleteSnapshot('snap-xxx')
```

### extendTimeout

Extend the sandbox timeout:

```ts
await sandbox.vercel.extendTimeout(60_000) // Add 60 seconds
```

### updateNetworkPolicy

Configure network access:

```ts
await sandbox.vercel.updateNetworkPolicy({
  allowInternet: true,
  allowedHosts: ['api.example.com'],
  blockedHosts: ['malicious.com'],
})
```

## Static Methods

List and get existing sandboxes:

```ts
import { VercelSandboxStatic } from 'unagent/sandbox'

// List all sandboxes
const { sandboxes } = await VercelSandboxStatic.list()

// Get existing sandbox by ID
const sandbox = await VercelSandboxStatic.get('vercel-xxx')
```

## Full Example

```ts
import { createSandbox } from 'unagent/sandbox'

export default async function handler(req: Request) {
  const sandbox = await createSandbox({
    provider: { name: 'vercel', runtime: 'node24' },
  })

  try {
    // Start a dev server
    const process = await sandbox.startProcess('npm', ['run', 'dev'])
    await process.waitForPort(3000)

    // Get the public URL
    const url = sandbox.vercel.domain(3000)

    // Get metadata
    const meta = sandbox.vercel.getMetadata()

    return Response.json({ url, meta })
  }
  finally {
    await sandbox.stop()
  }
}
```

## Vercel Provider Options

```ts
interface VercelProviderOptions {
  name: 'vercel'
  runtime?: string // Default: 'node24'
  timeout?: number // Default: 300000 (5 min)
  cpu?: number // vCPU count
  ports?: number[] // Ports to expose (enables vercel.domain)
}
```

## Limitations

Vercel sandbox does not support:
- `listFiles()` - throws `NotSupportedError`
- `exists()` - throws `NotSupportedError`
- `deleteFile()` - throws `NotSupportedError`
- `moveFile()` - throws `NotSupportedError`

Use file operations through `exec()` as a workaround:

```ts
// Instead of listFiles
const { stdout } = await sandbox.exec('ls', ['-la', '/app'])

// Instead of exists
const { ok } = await sandbox.exec('test', ['-e', '/app/file.txt'])

// Instead of deleteFile
await sandbox.exec('rm', ['-f', '/app/file.txt'])
```

## Capabilities

Check provider support for optional features:

```ts
if (sandbox.supports.startProcess) {
  const proc = await sandbox.startProcess('npm', ['run', 'dev'])
  await proc.waitForPort(3000)
}
```
