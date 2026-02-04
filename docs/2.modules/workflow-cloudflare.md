---
icon: i-simple-icons-cloudflare
---

# workflow-cloudflare

Cloudflare-specific workflow helpers via the `workflow.cloudflare` namespace.

## Setup

```ts
import { createWorkflow } from 'unagent/workflow'

const workflow = await createWorkflow({
  provider: { name: 'cloudflare', binding: env.USER_NOTIFICATIONS },
})

const cloudflare = workflow.cloudflare
```

## Cloudflare Namespace

### binding

Access the underlying Workflow binding:

```ts
const binding = workflow.cloudflare.binding
```

## Run Control

Cloudflare workflows support pause/resume/restart and event delivery:

```ts
const run = await workflow.start({ userId: '123' })
await run.pause?.()
await run.resume?.()
await run.sendEvent?.({ type: 'notify' })
```

## Batch Start

```ts
const runs = await workflow.startBatch?.([
  { payload: { userId: 'a' } },
  { payload: { userId: 'b' } },
])
```
