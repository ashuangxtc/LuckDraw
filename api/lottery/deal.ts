import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage';
import { generateRoundId, sampleFacesByCount } from '../_lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const activityState = await storage.getActivityState();
    if (activityState !== 'open') {
      return res.status(403).json({ error: 'ACTIVITY_NOT_OPEN' });
    }
    
    const config = await storage.getActivityConfig();
    const faces = sampleFacesByCount(config.redCountMode);
    const roundId = generateRoundId();
    
    await storage.setRound(roundId, { faces, createdAt: Date.now() });
    
    console.log(`发牌: roundId=${roundId}, faces=[${faces.join(',')}], redCountMode=${config.redCountMode}`);
    res.json({ roundId, faces });
  } catch (error) {
    console.error('Deal error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
