---
icon: i-simple-icons-weaviate
---

# vector-weaviate

Weaviate provider for `unagent/vector` (self-provided vectors).

## Setup

```ts
import { createVector } from 'unagent/vector'
import { openai } from 'unagent/vector/embeddings/openai'

const vector = await createVector({
  provider: {
    name: 'weaviate',
    host: 'localhost',
    port: 8080,
    grpcPort: 50051,
    embeddings: openai(),
  },
})
```

## Requirements

- A running Weaviate instance with `DEFAULT_VECTORIZER_MODULE=none`
- `WEAVIATE_URL` (optional if using the Docker compose)

## Namespace

```ts
const client = vector.weaviate.client
```

## E2E testing

Use the docker compose (includes Weaviate) and run:

```bash
VECTOR_E2E_DOCKER=1 pnpm playground:vector:e2e
```

Or run against a remote Weaviate:

```bash
WEAVIATE_URL=https://your-weaviate.example.com pnpm playground:vector:e2e
```
