import type { CostRates, UsageInfo } from '../usage'
import { calculateCost } from '../usage'

export type StopCondition<Ctx> = (ctx: Ctx) => boolean | Promise<boolean>

export function iterationCountIs(max: number): StopCondition<{ iteration: number }> {
  return ctx => ctx.iteration >= max
}

export function tokenCountIs(max: number): StopCondition<{ usage?: UsageInfo }> {
  return (ctx) => {
    if (!ctx.usage)
      return false
    return ctx.usage.inputTokens + ctx.usage.outputTokens >= max
  }
}

export function costIs(maxDollars: number, rates: CostRates): StopCondition<{ usage?: UsageInfo }> {
  return (ctx) => {
    if (!ctx.usage)
      return false
    return calculateCost(ctx.usage, rates) >= maxDollars
  }
}

export function timeout(ms: number): StopCondition<{ startTime: number }> {
  return ctx => Date.now() - ctx.startTime >= ms
}

export function and<Ctx>(...conditions: StopCondition<Ctx>[]): StopCondition<Ctx> {
  return async (ctx) => {
    for (const condition of conditions) {
      if (!(await condition(ctx)))
        return false
    }
    return true
  }
}

export function or<Ctx>(...conditions: StopCondition<Ctx>[]): StopCondition<Ctx> {
  return async (ctx) => {
    for (const condition of conditions) {
      if (await condition(ctx))
        return true
    }
    return false
  }
}

export function not<Ctx>(condition: StopCondition<Ctx>): StopCondition<Ctx> {
  return async ctx => !(await condition(ctx))
}
