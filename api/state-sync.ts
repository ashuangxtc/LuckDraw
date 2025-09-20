import type { VercelRequest, VercelResponse } from '@vercel/node';

// 全局状态存储
let globalState: 'waiting' | 'open' | 'closed' = 'waiting';
let globalConfig = {
  hongzhongPercent: 33,
  redCountMode: 1
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const action = query.action as string;
  
  // 获取状态
  if (method === 'GET' && action === 'get') {
    return res.json({
      state: globalState,
      config: globalConfig,
      open: globalState === 'open'
    });
  }
  
  // 设置状态 
  if (method === 'POST' && action === 'set-state') {
    const { state } = req.body || {};
    if (state && ['waiting', 'open', 'closed'].includes(state)) {
      globalState = state;
      console.log('Global state updated to:', globalState);
      return res.json({
        ok: true,
        state: globalState
      });
    }
    return res.status(400).json({ error: 'Invalid state' });
  }
  
  // 设置配置
  if (method === 'POST' && action === 'set-config') {
    const { hongzhongPercent, redCountMode } = req.body || {};
    
    if (typeof hongzhongPercent === 'number' && hongzhongPercent >= 0 && hongzhongPercent <= 100) {
      globalConfig.hongzhongPercent = hongzhongPercent;
    }
    if (typeof redCountMode === 'number' && [0, 1, 2, 3].includes(redCountMode)) {
      globalConfig.redCountMode = redCountMode;
    }
    
    console.log('Global config updated to:', globalConfig);
    return res.json({
      ok: true,
      config: globalConfig
    });
  }
  
  // 默认返回当前状态
  if (method === 'GET') {
    return res.json({
      state: globalState,
      config: globalConfig,
      open: globalState === 'open'
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
