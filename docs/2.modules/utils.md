---
icon: i-lucide-wrench
---

# utils

Utility functions for ANSI colors, formatting, and path manipulation.

```ts
import { bold, formatList, red, shortenPath } from 'unagent/utils'
```

## ANSI Colors

### Color Functions

Apply colors to strings:

```ts
import { blue, bold, cyan, dim, gray, green, red, yellow } from 'unagent/utils'

console.log(bold('Important'))
console.log(red('Error!'))
console.log(green('Success'))
console.log(yellow('Warning'))
console.log(dim('Muted text'))
```

### `ANSI`

Raw ANSI escape codes:

```ts
import { ANSI } from 'unagent/utils'

ANSI.reset // '\x1B[0m'
ANSI.bold // '\x1B[1m'
ANSI.dim // '\x1B[2m'
ANSI.red // '\x1B[31m'
ANSI.green // '\x1B[32m'
ANSI.yellow // '\x1B[33m'
ANSI.blue // '\x1B[34m'
ANSI.magenta // '\x1B[35m'
ANSI.cyan // '\x1B[36m'
ANSI.white // '\x1B[37m'
ANSI.gray // '\x1B[90m'
```

### `stripAnsi(str)`

Remove ANSI codes from string:

```ts
stripAnsi('\x1B[31mRed\x1B[0m') // "Red"
```

## Formatting

### `formatList(items, maxShow?)`

Format a list with truncation:

```ts
formatList(['a', 'b']) // "a, b"
formatList(['a', 'b', 'c', 'd']) // "a, b, c +1 more"
formatList(['a', 'b', 'c', 'd'], 2) // "a, b +2 more"
```

### `pluralize(count, singular, plural?)`

Pluralize a word:

```ts
pluralize(1, 'file') // "file"
pluralize(5, 'file') // "files"
pluralize(2, 'entry', 'entries') // "entries"
```

### `truncate(str, maxLength, suffix?)`

Truncate string with suffix:

```ts
truncate('Hello World', 8) // "Hello..."
truncate('Hello World', 8, '…') // "Hello W…"
truncate('Hi', 10) // "Hi"
```

## Paths

### `shortenPath(filepath, cwd?)`

Shorten a path for display:

```ts
shortenPath('/Users/you/code/project')
// → "~/code/project"

shortenPath('/Users/you/code/project/src/file.ts', '/Users/you/code/project')
// → "./src/file.ts"
```

### `expandPath(filepath)`

Expand `~` to home directory:

```ts
expandPath('~/.claude/skills')
// → "/Users/you/.claude/skills"

expandPath('./relative')
// → "/current/working/dir/relative"
```

## Example: CLI Output

```ts
import { bold, formatList, green, pluralize, red, shortenPath } from 'unagent/utils'

function printInstallSummary(installed: string[], failed: string[]) {
  if (installed.length > 0) {
    console.log(green('✓'), bold(pluralize(installed.length, 'skill')), 'installed:')
    console.log('  ', formatList(installed.map(s => shortenPath(s))))
  }

  if (failed.length > 0) {
    console.log(red('✗'), bold(pluralize(failed.length, 'skill')), 'failed:')
    console.log('  ', formatList(failed))
  }
}
```
