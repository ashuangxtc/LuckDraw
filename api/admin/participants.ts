import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage';
import { requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!(await requireAdmin(req, res))) {
    return;
  }

  try {
    const participants = await storage.getAllParticipants();
    const activityState = await storage.getActivityState();
    const config = await storage.getActivityConfig();
    
    const all = participants
      .sort((a, b) => a.pid - b.pid)
      .map(p => ({
        ...p,
        clientIdShort3: p.clientId ? (p.clientId.slice(-3).padStart(3,'0')) : null,
        status: p.participated ? (p.win ? '已中奖' : '未中奖') : '未参与',
        joinTime: new Date(p.joinedAt).toLocaleString('zh-CN'),
        drawTime: p.drawAt ? new Date(p.drawAt).toLocaleString('zh-CN') : null
      }));
    
    const stats = {
      total: all.length,
      participated: all.filter(p => p.participated).length,
      winners: all.filter(p => p.win === true).length,
      pending: all.filter(p => !p.participated).length
    };
    
    res.json({ 
      total: all.length, 
      items: all,
      state: activityState,
      config,
      stats
    });
  } catch (error) {
    console.error('Participants error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
