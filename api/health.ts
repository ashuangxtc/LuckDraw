import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({ 
    ok: true, 
    ts: Date.now(), 
    env: process.env.NODE_ENV || 'dev',
    message: 'Server is healthy'
  });
}
