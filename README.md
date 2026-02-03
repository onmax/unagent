# unagent

[![npm version](https://img.shields.io/npm/v/unagent?color=f43f5e)](https://npmjs.com/package/unagent)
[![npm downloads](https://img.shields.io/npm/dm/unagent?color=f43f5e)](https://npmjs.com/package/unagent)

Unified primitives for AI coding agents.

- Detect 45+ AI coding agents by env vars or config
- Discover and parse markdown-based skill files
- Parse GitHub/GitLab URLs, owner/repo shortcuts, local paths
- Clone repos, manage temp dirs, check git status
- Copy directories, create symlinks safely
- Track installed skills with lockfile and hashes

## Install

```bash
npm install unagent
```

## Usage

```ts
import { detectCurrentAgent, discoverSkills, parseSource } from 'unagent'

// Detect which agent is running
const agent = detectCurrentAgent()
if (agent) {
  console.log(`Running in ${agent.config.name}`)
}

// Discover skills
const skills = discoverSkills('~/.claude/skills', { recursive: true })

// The ".agents/skills" directory may also be supported for some agents.

// Parse source strings
parseSource('unjs/unagent') // github
parseSource('github:user/repo#main') // github with ref
parseSource('./local/path') // local
```

## Documentation

[unagent.onmax.me](https://unagent.onmax.me)

## License

MIT
