import type { VercelRequest, VercelResponse } from '@vercel/node';

// 简单的内存状态存储
let currentState: 'waiting' | 'open' | 'closed' = 'waiting';
let currentConfig = {
  hongzhongPercent: 33,
  redCountMode: 1
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const action = query.action as string;

  // 获取活动状态 - GET /api/lottery-basic?action=status
  if (method === 'GET' && action === 'status') {
    return res.json({
      open: currentState === 'open',
      state: currentState,
      redCountMode: currentConfig.redCountMode,
      config: currentConfig,
      stats: {
        totalParticipants: 0,
        participated: 0,
        winners: 0
      }
    });
  }

  // 获取配置 - GET /api/lottery-basic?action=config  
  if (method === 'GET' && action === 'config') {
    return res.json(currentConfig);
  }

  // 健康检查
  if (method === 'GET' && action === 'health') {
    return res.json({
      ok: true,
      message: 'Lottery API is working',
      state: currentState,
      timestamp: new Date().toISOString()
    });
  }

  // 简单的抽奖功能（如果需要的话）
  if (method === 'POST' && action === 'join') {
    return res.json({
      pid: Math.floor(Math.random() * 1000),
      participated: false,
      win: false
    });
  }

  if (method === 'POST' && action === 'draw') {
    if (currentState !== 'open') {
      return res.status(403).json({ error: 'ACTIVITY_NOT_OPEN', state: currentState });
    }

    const choice = req.body?.choice || 0;
    const win = Math.random() < (currentConfig.hongzhongPercent / 100);
    
    return res.json({
      ok: true,
      pid: Math.floor(Math.random() * 1000),
      win,
      isWinner: win,
      label: win ? '红中' : '白板',
      deck: ['baiban', 'baiban', 'hongzhong'],
      winIndex: win ? choice : 2
    });
  }

  return res.status(404).json({ error: 'Not found' });
}
