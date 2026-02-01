import { describe, expect, it } from 'vitest'
import { defineTool, toolsToSchema, toolToSchema } from '../src/tool'

describe('tool/defineTool', () => {
  it('returns tool definition unchanged', () => {
    const tool = defineTool({ name: 'test', description: 'A test tool' })
    expect(tool.name).toBe('test')
    expect(tool.description).toBe('A test tool')
  })

  it('preserves parameters', () => {
    const tool = defineTool({
      name: 'greet',
      description: 'Greet someone',
      parameters: { name: { type: 'string', required: true } },
    })
    expect(tool.parameters?.name.type).toBe('string')
  })
})

describe('tool/toolToSchema', () => {
  it('converts simple tool to JSON Schema', () => {
    const tool = defineTool({ name: 'hello', description: 'Says hello' })
    const schema = toolToSchema(tool)

    expect(schema.name).toBe('hello')
    expect(schema.description).toBe('Says hello')
    expect(schema.input_schema.type).toBe('object')
    expect(schema.input_schema.additionalProperties).toBe(false)
  })

  it('converts string parameter', () => {
    const tool = defineTool({
      name: 'greet',
      description: 'Greet',
      parameters: { name: { type: 'string', description: 'Name to greet', required: true } },
    })
    const schema = toolToSchema(tool)

    expect(schema.input_schema.properties.name.type).toBe('string')
    expect(schema.input_schema.properties.name.description).toBe('Name to greet')
    expect(schema.input_schema.required).toContain('name')
  })

  it('converts number parameter with enum', () => {
    const tool = defineTool({
      name: 'rate',
      description: 'Rate something',
      parameters: { rating: { type: 'number', enum: [1, 2, 3, 4, 5] } },
    })
    const schema = toolToSchema(tool)

    expect(schema.input_schema.properties.rating.type).toBe('number')
    expect(schema.input_schema.properties.rating.enum).toEqual([1, 2, 3, 4, 5])
  })

  it('converts array parameter with items', () => {
    const tool = defineTool({
      name: 'list',
      description: 'Process list',
      parameters: { items: { type: 'array', items: { type: 'string' } } },
    })
    const schema = toolToSchema(tool)

    expect(schema.input_schema.properties.items.type).toBe('array')
    expect(schema.input_schema.properties.items.items?.type).toBe('string')
  })

  it('converts nested object parameter', () => {
    const tool = defineTool({
      name: 'user',
      description: 'Create user',
      parameters: {
        profile: {
          type: 'object',
          properties: {
            name: { type: 'string', required: true },
            age: { type: 'number' },
          },
        },
      },
    })
    const schema = toolToSchema(tool)

    expect(schema.input_schema.properties.profile.type).toBe('object')
    expect(schema.input_schema.properties.profile.properties?.name.type).toBe('string')
    expect(schema.input_schema.properties.profile.required).toContain('name')
  })

  it('handles default values', () => {
    const tool = defineTool({
      name: 'config',
      description: 'Config',
      parameters: { timeout: { type: 'number', default: 30 } },
    })
    const schema = toolToSchema(tool)

    expect(schema.input_schema.properties.timeout.default).toBe(30)
  })

  it('omits required array when empty', () => {
    const tool = defineTool({
      name: 'test',
      description: 'Test',
      parameters: { optional: { type: 'string' } },
    })
    const schema = toolToSchema(tool)

    expect(schema.input_schema.required).toBeUndefined()
  })
})

describe('tool/toolsToSchema', () => {
  it('converts multiple tools', () => {
    const tools = [
      defineTool({ name: 'a', description: 'Tool A' }),
      defineTool({ name: 'b', description: 'Tool B' }),
    ]
    const schemas = toolsToSchema(tools)

    expect(schemas).toHaveLength(2)
    expect(schemas[0].name).toBe('a')
    expect(schemas[1].name).toBe('b')
  })
})
