import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage';
import { requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const config = await storage.getActivityConfig();
      res.json(config);
    } catch (error) {
      console.error('Get config error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    if (!(await requireAdmin(req, res))) {
      return;
    }

    try {
      const { redCountMode } = req.body;
      
      if (![0, 1, 2, 3].includes(Number(redCountMode))) {
        return res.status(400).json({ error: 'redCountMode must be 0|1|2|3' });
      }
      
      const config = await storage.getActivityConfig();
      const prevMode = config.redCountMode;
      config.redCountMode = Number(redCountMode);
      
      await storage.setActivityConfig(config);
      
      console.log(`管理员更新红中张数: ${prevMode} -> ${redCountMode}`);
      res.json({ ok: true, redCountMode: config.redCountMode });
    } catch (error) {
      console.error('Set config error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
