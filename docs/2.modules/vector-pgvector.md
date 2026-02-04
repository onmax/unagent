---
icon: i-simple-icons-postgresql
---

# vector-pgvector

PostgreSQL pgvector provider for `unagent/vector`.

## Setup

```ts
import { createVector } from 'unagent/vector'
import { ollama } from 'unagent/vector/embeddings/ollama'

const vector = await createVector({
  provider: {
    name: 'pgvector',
    url: process.env.DATABASE_URL!,
    embeddings: ollama({ model: 'nomic-embed-text' }),
    table: 'vectors',
    metric: 'cosine',
  },
})
```

## Namespace

```ts
const pool = vector.pgvector.pool
```
