import { QueueError } from './errors'

export interface VerifyQStashSignatureOptions {
  currentSigningKey: string
  nextSigningKey?: string
  body?: string
  url?: string
}

export async function verifyQStashSignature(request: Request, options: VerifyQStashSignatureOptions): Promise<boolean> {
  const signature = request.headers.get('upstash-signature')
  if (!signature)
    throw new QueueError('[qstash] Missing Upstash-Signature header')

  let ReceiverCtor: any
  try {
    // Avoid bundlers resolving this optional dependency in edge builds.
    const modId = `@upstash/${String.fromCharCode(113, 115, 116, 97, 115, 104)}` // qstash
    const mod: any = await import(modId)
    ReceiverCtor = mod.Receiver || mod.default?.Receiver || mod.default
  }
  catch (error) {
    throw new QueueError(`@upstash/qstash load failed. Install it to verify QStash signatures. Original error: ${error instanceof Error ? error.message : error}`)
  }
  if (!ReceiverCtor)
    throw new QueueError('[qstash] Receiver is not available from @upstash/qstash')

  const receiver = new ReceiverCtor({
    currentSigningKey: options.currentSigningKey,
    ...(options.nextSigningKey ? { nextSigningKey: options.nextSigningKey } : {}),
  })

  const body = options.body ?? await request.text()
  const url = options.url ?? request.url
  return await receiver.verify({ body, signature, url })
}
