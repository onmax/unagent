export function shellQuote(arg: string): string {
  if (!/[^\w\-./=]/.test(arg))
    return arg
  return `'${arg.replace(/'/g, `'\\''`)}'`
}
