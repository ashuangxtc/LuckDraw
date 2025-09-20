import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage, type ActivityState } from '../_lib/storage';
import { requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!(await requireAdmin(req, res))) {
    return;
  }

  try {
    const { state } = req.body;
    
    if (!['waiting', 'open', 'closed'].includes(state)) {
      return res.status(400).json({ error: 'INVALID_STATE' });
    }
    
    const prevState = await storage.getActivityState();
    await storage.setActivityState(state as ActivityState);
    
    console.log(`管理员设置活动状态: ${prevState} -> ${state}`);
    res.json({ ok: true, state });
  } catch (error) {
    console.error('Set state error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
