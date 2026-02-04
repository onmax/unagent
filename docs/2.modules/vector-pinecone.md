---
icon: i-simple-icons-pinecone
---

# vector-pinecone

Pinecone provider for `unagent/vector`.

## Setup

```ts
import { createVector } from 'unagent/vector'
import { openai } from 'unagent/vector/embeddings/openai'

const vector = await createVector({
  provider: {
    name: 'pinecone',
    apiKey: process.env.PINECONE_API_KEY!,
    host: process.env.PINECONE_HOST!,
    namespace: 'chunks',
    embeddings: openai({ model: 'text-embedding-3-small' }),
  },
})
```

## Requirements

- Pinecone account + vector index
- Set `PINECONE_API_KEY`
- Set either `PINECONE_HOST` (recommended) or `PINECONE_INDEX`

## Namespace

```ts
const index = vector.pinecone.index
```

## E2E testing

Set:

- `PINECONE_API_KEY`
- `PINECONE_HOST` (or `PINECONE_INDEX`)
- `PINECONE_NAMESPACE` (optional)

Run:

```bash
pnpm playground:vector:e2e
```

Note: the e2e runner uses a 32-dimension embedding. Ensure your index is created with dimension `32` and metric `cosine`.
