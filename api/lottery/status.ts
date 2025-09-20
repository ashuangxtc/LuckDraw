import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const activityState = await storage.getActivityState();
    const config = await storage.getActivityConfig();
    const participants = await storage.getAllParticipants();
    
    const stats = {
      totalParticipants: participants.length,
      participated: participants.filter(p => p.participated).length,
      winners: participants.filter(p => p.win === true).length
    };

    res.json({ 
      open: activityState === 'open',
      state: activityState,
      redCountMode: config.redCountMode,
      config,
      stats
    });
  } catch (error) {
    console.error('Status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
