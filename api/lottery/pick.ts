import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { roundId, index } = req.body || {};
    const round = await storage.getRound(roundId);
    
    if (!round) {
      return res.status(404).json({ error: 'ROUND_NOT_FOUND' });
    }
    
    const face = round.faces[index] || 'blank';
    const win = face === 'zhong';
    await storage.deleteRound(roundId); // 用一次即废，防止复用
    
    console.log(`选牌: roundId=${roundId}, index=${index}, face=${face}, win=${win}`);
    res.json({ win, face, faces: round.faces });
  } catch (error) {
    console.error('Pick error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
