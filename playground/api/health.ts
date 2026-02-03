import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  res.status(200).json({ ok: true, timestamp: new Date().toISOString() })
}
