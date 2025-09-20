import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage';
import { requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!(await requireAdmin(req, res))) {
    return;
  }

  try {
    await storage.resetAll();
    console.log('管理员重置所有数据');
    res.json({ ok: true });
  } catch (error) {
    console.error('Reset all error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
