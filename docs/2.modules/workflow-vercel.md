---
icon: i-simple-icons-vercel
---

# workflow-vercel

Vercel-specific workflow helpers via the `workflow.vercel` namespace.

## Setup

```ts
import { createWorkflow } from 'unagent/workflow'
import { userSignupWorkflow } from './workflows/user-signup'

const workflow = await createWorkflow({
  provider: { name: 'vercel', workflow: userSignupWorkflow },
})

const vercel = workflow.vercel
```

## Vercel Namespace

### workflow

The configured workflow name:

```ts
const definition = workflow.vercel.workflow
```

### api

Escape hatch to the underlying `workflow/api` module:

```ts
const { start, getRun } = workflow.vercel.api
```

## Example

```ts
const run = await workflow.start(['user@example.com'])
const status = await run.status()

if (status.state === 'running') {
  await run.stop()
}
```
