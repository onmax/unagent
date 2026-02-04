---
icon: i-simple-icons-upstash
---

# vector-upstash

Upstash Vector provider for `unagent/vector`.

## Setup

```ts
import { createVector } from 'unagent/vector'

const vector = await createVector({
  provider: {
    name: 'upstash',
    url: process.env.UPSTASH_VECTOR_URL!,
    token: process.env.UPSTASH_VECTOR_TOKEN!,
    namespace: 'chunks',
  },
})
```

## Requirements

You need an Upstash account and a Vector index. Set:

- `UPSTASH_VECTOR_URL` or `UPSTASH_VECTOR_REST_URL`
- `UPSTASH_VECTOR_TOKEN` or `UPSTASH_VECTOR_REST_TOKEN`

## Namespace

```ts
const index = vector.upstash.index
```
