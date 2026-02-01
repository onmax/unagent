import { describe, expect, it } from 'vitest'
import { execSafe, execSafeSync } from '../src/exec'

describe('exec/execSafe', () => {
  it('runs command successfully', async () => {
    const result = await execSafe('echo', ['hello'])
    expect(result.ok).toBe(true)
    expect(result.code).toBe(0)
    expect(result.stdout).toBe('hello')
    expect(result.stderr).toBe('')
    expect(result.truncated).toBe(false)
    expect(result.timedOut).toBe(false)
  })

  it('captures exit code on failure', async () => {
    const result = await execSafe('node', ['-e', 'process.exit(42)'])
    expect(result.ok).toBe(false)
    expect(result.code).toBe(42)
  })

  it('captures stderr', async () => {
    const result = await execSafe('node', ['-e', 'console.error("err")'])
    expect(result.stderr).toBe('err')
  })

  it('respects cwd option', async () => {
    const result = await execSafe('node', ['-e', 'console.log(process.cwd())'], { cwd: process.cwd() })
    expect(result.stdout).toContain('unagent')
  })

  it('passes env variables', async () => {
    const result = await execSafe('node', ['-e', 'console.log(process.env.TEST_VAR)'], { env: { TEST_VAR: 'hello' } })
    expect(result.stdout).toBe('hello')
  })

  it('handles stdin', async () => {
    const result = await execSafe('node', ['-e', 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>process.stdout.write(d))'], { stdin: 'input text' })
    expect(result.stdout).toBe('input text')
  })

  it('truncates output exceeding maxOutput', async () => {
    const result = await execSafe('node', ['-e', 'console.log("a".repeat(200))'], { maxOutput: 50 })
    expect(result.truncated).toBe(true)
    expect(result.stdout.length).toBeLessThanOrEqual(50)
  })

  it('times out long-running commands', async () => {
    const result = await execSafe('node', ['-e', 'setTimeout(()=>{},10000)'], { timeout: 100 })
    expect(result.timedOut).toBe(true)
    expect(result.ok).toBe(false)
  })

  it('returns error for non-existent command', async () => {
    const result = await execSafe('nonexistent-command-xyz', [])
    expect(result.ok).toBe(false)
    expect(result.code).toBe(null)
  })
})

describe('exec/execSafeSync', () => {
  it('runs command successfully', () => {
    const result = execSafeSync('echo', ['hello'])
    expect(result.ok).toBe(true)
    expect(result.code).toBe(0)
    expect(result.stdout).toBe('hello')
  })

  it('captures exit code on failure', () => {
    const result = execSafeSync('node', ['-e', 'process.exit(1)'])
    expect(result.ok).toBe(false)
    expect(result.code).toBe(1)
  })

  it('respects cwd option', () => {
    const result = execSafeSync('node', ['-e', 'console.log(process.cwd())'], { cwd: process.cwd() })
    expect(result.stdout).toContain('unagent')
  })

  it('truncates output exceeding maxOutput', () => {
    const result = execSafeSync('node', ['-e', 'console.log("a".repeat(200))'], { maxOutput: 50 })
    expect(result.truncated).toBe(true)
    expect(result.stdout.length).toBeLessThanOrEqual(50)
  })
})
