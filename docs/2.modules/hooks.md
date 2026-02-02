---
icon: i-lucide-webhook
---

# hooks

Agent lifecycle hooks powered by [hookable](https://github.com/unjs/hookable). Subscribe to tool calls, LLM interactions, and iteration events.

```ts
import { createAgentHooks } from 'unagent/hooks'
```

## createAgentHooks

Creates a hookable instance with agent-specific events.

```ts
const hooks = createAgentHooks()

hooks.hook('tool:before', ({ name, args }) => {
  console.log(`Calling ${name}`, args)
})

hooks.hook('tool:after', ({ name, result }) => {
  console.log(`${name} returned`, result)
})

hooks.hook('llm:after', ({ response, usage }) => {
  console.log(`Tokens: ${usage?.inputTokens} in, ${usage?.outputTokens} out`)
})
```

## Available Hooks

| Hook | Payload | Description |
|------|---------|-------------|
| `tool:before` | `{ name, args }` | Before a tool executes |
| `tool:after` | `{ name, args, result }` | After tool completes |
| `tool:error` | `{ name, error }` | On tool error |
| `llm:before` | `{ messages }` | Before LLM call |
| `llm:after` | `{ response, usage? }` | After LLM response |
| `iteration:start` | `{ iteration }` | Agent loop iteration starts |
| `iteration:end` | `{ iteration }` | Agent loop iteration ends |

## Types

```ts
interface AgentHooks {
  'tool:before': (payload: { name: string, args: unknown }) => void | Promise<void>
  'tool:after': (payload: { name: string, args: unknown, result: unknown }) => void | Promise<void>
  'tool:error': (payload: { name: string, error: Error }) => void | Promise<void>
  'llm:before': (payload: { messages: unknown[] }) => void | Promise<void>
  'llm:after': (payload: { response: unknown, usage?: UsageInfo }) => void | Promise<void>
  'iteration:start': (payload: { iteration: number }) => void | Promise<void>
  'iteration:end': (payload: { iteration: number }) => void | Promise<void>
}

type AgentHooksInstance = Hookable<AgentHooks>
```

## Example: Logging & Monitoring

```ts
import { createAgentHooks } from 'unagent/hooks'
import { aggregateUsage } from 'unagent/usage'

const hooks = createAgentHooks()
const usages: UsageInfo[] = []

hooks.hook('llm:after', ({ usage }) => {
  if (usage)
    usages.push(usage)
})

hooks.hook('iteration:end', ({ iteration }) => {
  const total = aggregateUsage(...usages)
  console.log(`Iteration ${iteration}: ${total.inputTokens + total.outputTokens} tokens`)
})
```
