export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description?: string
  required?: boolean
  enum?: (string | number | boolean)[]
  items?: ToolParameter
  properties?: Record<string, ToolParameter>
  default?: unknown
}

export interface ToolDefinition {
  name: string
  description: string
  parameters?: Record<string, ToolParameter>
}

export interface JSONSchema {
  type: 'object'
  properties: Record<string, JSONSchemaProperty>
  required?: string[]
  additionalProperties?: boolean
}

export interface JSONSchemaProperty {
  type: string | string[]
  description?: string
  enum?: (string | number | boolean)[]
  items?: JSONSchemaProperty
  properties?: Record<string, JSONSchemaProperty>
  required?: string[]
  default?: unknown
}

export function defineTool<T extends ToolDefinition>(tool: T): T {
  return tool
}

function parameterToJSONSchema(param: ToolParameter): JSONSchemaProperty {
  const schema: JSONSchemaProperty = { type: param.type }

  if (param.description)
    schema.description = param.description
  if (param.enum)
    schema.enum = param.enum
  if (param.default !== undefined)
    schema.default = param.default

  if (param.type === 'array' && param.items)
    schema.items = parameterToJSONSchema(param.items)

  if (param.type === 'object' && param.properties) {
    schema.properties = {}
    const required: string[] = []

    for (const [key, value] of Object.entries(param.properties)) {
      schema.properties[key] = parameterToJSONSchema(value)
      if (value.required)
        required.push(key)
    }

    if (required.length > 0)
      schema.required = required
  }

  return schema
}

export function toolToSchema(tool: ToolDefinition): { name: string, description: string, input_schema: JSONSchema } {
  const properties: Record<string, JSONSchemaProperty> = {}
  const required: string[] = []

  if (tool.parameters) {
    for (const [key, param] of Object.entries(tool.parameters)) {
      properties[key] = parameterToJSONSchema(param)
      if (param.required)
        required.push(key)
    }
  }

  return {
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
      additionalProperties: false,
    },
  }
}

export function toolsToSchema(tools: ToolDefinition[]): { name: string, description: string, input_schema: JSONSchema }[] {
  return tools.map(toolToSchema)
}
