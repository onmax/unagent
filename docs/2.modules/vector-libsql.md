---
icon: i-simple-icons-turso
---

# vector-libsql

LibSQL / Turso provider for `unagent/vector`.

## Setup

```ts
import { createVector } from 'unagent/vector'
import { openai } from 'unagent/vector/embeddings/openai'

const vector = await createVector({
  provider: {
    name: 'libsql',
    url: 'libsql://your-db.turso.io',
    authToken: process.env.TURSO_AUTH_TOKEN,
    embeddings: openai(),
  },
})
```

## Namespace

```ts
const client = vector.libsql.client
```
