---
icon: i-lucide-wrench
---

# tool

The tool module defines typed tool parameters and converts them to JSON Schema for LLM APIs. Use this module to create tool definitions that work with Claude, OpenAI, and other AI providers.

```ts
import { defineTool, toolsToSchema, toolToSchema } from 'unagent/tool'
```

## Define Tools

### `defineTool(tool)`

The `defineTool` function creates a type-safe tool definition with parameters.

```ts
const searchTool = defineTool({
  name: 'search',
  description: 'Search the web for information',
  parameters: {
    query: { type: 'string', description: 'Search query', required: true },
    limit: { type: 'number', description: 'Max results', default: 10 },
  },
})
```

## Convert to JSON Schema

### `toolToSchema(tool)`

The `toolToSchema` function converts a tool definition to JSON Schema format. The output is compatible with Claude and OpenAI APIs.

```ts
const schema = toolToSchema(searchTool)
// {
//   name: 'search',
//   description: 'Search the web for information',
//   input_schema: {
//     type: 'object',
//     properties: {
//       query: { type: 'string', description: 'Search query' },
//       limit: { type: 'number', description: 'Max results', default: 10 }
//     },
//     required: ['query'],
//     additionalProperties: false
//   }
// }
```

### `toolsToSchema(tools)`

The `toolsToSchema` function converts an array of tools to their JSON Schema representations.

```ts
const schemas = toolsToSchema([searchTool, readFileTool])
```

## Parameter Types

The following examples demonstrate each supported parameter type.

### String

```ts
const tool = defineTool({
  name: 'greet',
  description: 'Greet user',
  parameters: {
    name: { type: 'string', description: 'User name', required: true },
  },
})
```

### Number

```ts
const tool = defineTool({
  name: 'paginate',
  description: 'Paginate results',
  parameters: {
    count: { type: 'number', default: 10 },
  },
})
```

### Boolean

```ts
const tool = defineTool({
  name: 'run',
  description: 'Run command',
  parameters: {
    verbose: { type: 'boolean', default: false },
  },
})
```

### Enum

```ts
const tool = defineTool({
  name: 'update',
  description: 'Update status',
  parameters: {
    status: { type: 'string', enum: ['pending', 'active', 'done'] },
  },
})
```

### Array

```ts
const tool = defineTool({
  name: 'tag',
  description: 'Add tags',
  parameters: {
    tags: { type: 'array', items: { type: 'string' } },
  },
})
```

### Nested Object

```ts
const tool = defineTool({
  name: 'connect',
  description: 'Connect to server',
  parameters: {
    config: {
      type: 'object',
      properties: {
        host: { type: 'string', required: true },
        port: { type: 'number', default: 3000 },
      },
    },
  },
})
```

## Types

```ts
interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description?: string
  required?: boolean
  enum?: (string | number | boolean)[]
  items?: ToolParameter // for arrays
  properties?: Record<string, ToolParameter> // for objects
  default?: unknown
}

interface ToolDefinition {
  name: string
  description: string
  parameters?: Record<string, ToolParameter>
}
```

## Example: Full Tool Set

The following example demonstrates a complete tool set for file operations.

```ts
import { defineTool, toolsToSchema } from 'unagent/tool'

const readFile = defineTool({
  name: 'read_file',
  description: 'Read contents of a file',
  parameters: {
    path: { type: 'string', description: 'File path', required: true },
    encoding: { type: 'string', enum: ['utf-8', 'base64'], default: 'utf-8' },
  },
})

const writeFile = defineTool({
  name: 'write_file',
  description: 'Write contents to a file',
  parameters: {
    path: { type: 'string', description: 'File path', required: true },
    content: { type: 'string', description: 'File content', required: true },
  },
})

const listDir = defineTool({
  name: 'list_directory',
  description: 'List files in a directory',
  parameters: {
    path: { type: 'string', description: 'Directory path', required: true },
    recursive: { type: 'boolean', default: false },
  },
})

// Convert all for API
const tools = toolsToSchema([readFile, writeFile, listDir])
```
