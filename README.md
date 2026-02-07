# unagent

[![npm version](https://img.shields.io/npm/v/unagent?color=f43f5e)](https://npmjs.com/package/unagent)
[![npm downloads](https://img.shields.io/npm/dm/unagent?color=f43f5e)](https://npmjs.com/package/unagent)

Unified primitives for AI coding agents.

- Detect 40+ AI coding agents by env vars or config
- Discover and parse markdown-based skill files
- Install/uninstall skills from local paths or git sources
- Track installed skills with a lockfile and hashes

## Install

```bash
npm install unagent
```

## Usage

```ts
import { detectCurrentAgent, discoverSkills, installSkill } from 'unagent'

// Detect which agent is running
const agent = detectCurrentAgent()
if (agent) {
  console.log(`Running in ${agent.config.name}`)
}

// Discover skills
const skills = discoverSkills('~/.claude/skills', { recursive: true })

// Install skills (local or git sources)
await installSkill({ source: 'unjs/unagent' })
await installSkill({ source: './local/skills', mode: 'symlink' })
```

## Documentation

- [Docs home](https://unagent.unjs.io)
- [Getting started](https://unagent.unjs.io/guide)
- [Core](https://unagent.unjs.io/core)

## License

MIT
