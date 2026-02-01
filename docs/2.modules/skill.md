---
icon: i-lucide-file-text
---

# skill

Discover and parse [agentskills.io](https://agentskills.io/specification) compliant skill files.

```ts
import { discoverSkills, parseSkillMd, validateSkill, toPromptXml } from 'unagents/skill'
```

## Skill Directory Format

Skills follow [agentskills.io spec](https://agentskills.io/specification): each skill is a **directory** containing `SKILL.md`.

```
skills/
├── pdf-processing/
│   └── SKILL.md
├── typescript-helper/
│   └── SKILL.md
```

### SKILL.md Format

```md [pdf-processing/SKILL.md]
---
name: pdf-processing
description: Extracts text and metadata from PDF files
license: MIT
compatibility: claude-code, cursor
allowed-tools: Bash Read Write
metadata:
  author: johndoe
  version: 1.0.0
---

# Instructions

Your instructions for the agent go here...
```

## Parsing

### `parseSkillMd(content)`

Parse a skill markdown file with frontmatter.

```ts
const parsed = parseSkillMd(`---
name: typescript-helper
description: Helps with TypeScript code
globs: ["*.ts", "*.tsx"]
---
You are a TypeScript expert...
`)

parsed.frontmatter // { name, description, globs, ... }
parsed.content     // "You are a TypeScript expert..."
parsed.raw         // Original content
```

### `extractSkillName(frontmatter, filename?)`

Extract skill name from frontmatter or filename.

```ts
extractSkillName({ name: 'my-skill', description: 'test' })  // "my-skill"
extractSkillName({ name: '', description: '' }, 'my-skill.md')  // "my skill"
```

## Validation

### `validateSkill(parsed, dirName?)`

Validate a skill against [agentskills.io spec](https://agentskills.io/specification).

```ts
const result = validateSkill(parsed, 'pdf-processing')

result.valid     // true if no errors
result.errors    // ["name is required", ...]
result.warnings  // ["skill content is empty", ...]
```

Validation rules:
- `name`: required, 1-64 chars, lowercase + hyphens only, no `--`, must match dir name
- `description`: required, 1-1024 chars
- `compatibility`: max 500 chars if present

## Discovery

### `discoverSkills(dir, options?)`

Find all skill directories (containing `SKILL.md`).

```ts
const skills = discoverSkills('~/.claude/skills', {
  recursive: true,  // Search nested directories
})

for (const skill of skills) {
  console.log(skill.name)    // Directory name (= skill name)
  console.log(skill.path)    // Full directory path
  console.log(skill.parsed)  // ParsedSkill object
}
```

### `filterSkills(skills, query)`

Filter skills by name, description, or tags.

```ts
const tsSkills = filterSkills(skills, 'typescript')
```

### `findSkillByName(skills, name)`

Find a skill by exact name match.

```ts
const skill = findSkillByName(skills, 'pdf-processing')
```

## Prompt Generation

### `toPromptXml(skills)`

Generate XML for agent system prompts (per spec).

```ts
const xml = toPromptXml(skills)
```

Output:
```xml
<available_skills>
  <skill>
    <name>pdf-processing</name>
    <description>Extracts text from PDFs...</description>
    <location>/path/to/skills/pdf-processing</location>
  </skill>
</available_skills>
```

## Types

```ts
interface SkillFrontmatter {
  // Required by spec
  name: string         // lowercase, hyphens, 1-64 chars
  description: string  // 1-1024 chars

  // Optional per spec
  license?: string
  compatibility?: string        // max 500 chars
  metadata?: Record<string, string>
  'allowed-tools'?: string      // space-delimited

  // Extended (agent-specific)
  globs?: string | string[]
  alwaysApply?: boolean
  tags?: string[]
}

interface ParsedSkill {
  frontmatter: SkillFrontmatter
  content: string
  raw: string
}

interface DiscoveredSkill {
  path: string     // Directory path
  name: string     // Directory name
  parsed: ParsedSkill
}

interface DiscoverOptions {
  recursive?: boolean
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
```

## Frontmatter Fields

| Field | Type | Spec | Description |
|-------|------|------|-------------|
| `name` | `string` | Required | Skill identifier (lowercase, hyphens) |
| `description` | `string` | Required | Short description (max 1024 chars) |
| `license` | `string` | Optional | SPDX license identifier |
| `compatibility` | `string` | Optional | Supported agents (max 500 chars) |
| `metadata` | `object` | Optional | Custom key-value pairs |
| `allowed-tools` | `string` | Optional | Space-delimited tool names |
| `globs` | `string \| string[]` | Extended | File patterns to match |
| `alwaysApply` | `boolean` | Extended | Always include this skill |
| `tags` | `string[]` | Extended | Tags for filtering |
