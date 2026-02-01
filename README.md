# unagent

[![npm version](https://img.shields.io/npm/v/unagents?color=f43f5e)](https://npmjs.com/package/unagents)
[![npm downloads](https://img.shields.io/npm/dm/unagents?color=f43f5e)](https://npmjs.com/package/unagents)

Unified primitives for AI coding agents.

- Detect 40+ AI coding agents by env vars or config
- Discover and parse markdown-based skill files
- Parse GitHub/GitLab URLs, owner/repo shortcuts, local paths
- Clone repos, manage temp dirs, check git status
- Copy directories, create symlinks safely
- Track installed skills with lockfile and hashes

## Install

```bash
npm install unagents
```

## Usage

```ts
import { detectCurrentAgent, discoverSkills, parseSource } from 'unagents'

// Detect which agent is running
const agent = detectCurrentAgent()
if (agent) {
  console.log(`Running in ${agent.config.name}`)
}

// Discover skills
const skills = discoverSkills('~/.claude/skills', { recursive: true })

// Parse source strings
parseSource('unjs/unagent')          // github
parseSource('github:user/repo#main') // github with ref
parseSource('./local/path')          // local
```

## Documentation

[unagent.unjs.io](https://unagent.unjs.io)

## License

MIT
