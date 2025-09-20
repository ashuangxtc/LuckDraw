import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getState, getConfig } from './_shared/state';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const action = query.action as string;

  // 获取活动状态 - GET /api/lottery-basic?action=status
  if (method === 'GET' && action === 'status') {
    const state = getState();
    const config = getConfig();
    return res.json({
      open: state === 'open',
      state: state,
      redCountMode: config.redCountMode,
      config: config,
      stats: {
        totalParticipants: 0,
        participated: 0,
        winners: 0
      }
    });
  }

  // 获取配置 - GET /api/lottery-basic?action=config  
  if (method === 'GET' && action === 'config') {
    return res.json(getConfig());
  }

  // 健康检查
  if (method === 'GET' && action === 'health') {
    return res.json({
      ok: true,
      message: 'Lottery API is working',
      state: getState(),
      timestamp: new Date().toISOString()
    });
  }

  // 参与抽奖 - POST /api/lottery-basic?action=join
  if (method === 'POST' && action === 'join') {
    return res.json({
      pid: Math.floor(Math.random() * 1000),
      participated: false,
      win: false
    });
  }

  // 抽奖 - POST /api/lottery-basic?action=draw
  if (method === 'POST' && action === 'draw') {
    const state = getState();
    if (state !== 'open') {
      return res.status(403).json({ error: 'ACTIVITY_NOT_OPEN', state: state });
    }

    const pick = req.body?.pick || 0;
    const config = getConfig();
    const win = Math.random() < (config.hongzhongPercent / 100);
    
    return res.json({
      ok: true,
      pid: Math.floor(Math.random() * 1000),
      win,
      isWinner: win,
      label: win ? '红中' : '白板',
      deck: win ? ['baiban', 'baiban', 'hongzhong'] : ['hongzhong', 'baiban', 'baiban'],
      winIndex: win ? pick : (pick === 0 ? 1 : 0)
    });
  }

  // 发牌 - POST /api/lottery-basic?action=deal
  if (method === 'POST' && action === 'deal') {
    if (getState() !== 'open') {
      return res.status(403).json({ error: 'ACTIVITY_NOT_OPEN' });
    }
    
    return res.json({
      ok: true,
      cards: ['back', 'back', 'back'],
      message: '准备抽取'
    });
  }

  // 选择 - POST /api/lottery-basic?action=pick
  if (method === 'POST' && action === 'pick') {
    if (getState() !== 'open') {
      return res.status(403).json({ error: 'ACTIVITY_NOT_OPEN' });
    }

    const win = Math.random() < (getConfig().hongzhongPercent / 100);
    return res.json({
      ok: true,
      win,
      result: win ? 'hongzhong' : 'baiban'
    });
  }

  // 排列 - GET /api/lottery-basic?action=arrangement  
  if (method === 'GET' && action === 'arrangement') {
    return res.json({
      ok: true,
      arrangement: ['back', 'back', 'back']
    });
  }

  return res.status(404).json({ error: 'Not found' });
}
