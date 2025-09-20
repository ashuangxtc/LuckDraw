import type { VercelRequest, VercelResponse } from '@vercel/node';

// 共享状态存储
let currentState: 'waiting' | 'open' | 'closed' = 'waiting';
let currentConfig = {
  hongzhongPercent: 33,
  redCountMode: 1
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const action = query.action as string;

  // 基本的健康检查
  if (method === 'GET' && action === 'health') {
    return res.json({ 
      ok: true, 
      message: 'Admin API is working',
      timestamp: new Date().toISOString()
    });
  }

  // 简单的登录测试
  if (method === 'POST' && action === 'login') {
    try {
      const { password } = req.body || {};
      const expectedPassword = process.env.ADMIN_PASSWORD || 'Dreammore123';
      
      if (password === expectedPassword) {
        // 设置简单的会话标记
        res.setHeader('Set-Cookie', 'admin_logged_in=true; HttpOnly; Max-Age=7200; SameSite=Lax; Path=/');
        return res.json({ ok: true, message: 'Login successful' });
      } else {
        return res.status(401).json({ ok: false, error: 'Invalid password' });
      }
    } catch (error) {
      return res.status(500).json({ 
        ok: false, 
        error: 'Login failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // 检查登录状态
  if (method === 'GET' && action === 'me') {
    const cookies = req.headers.cookie || '';
    const isLoggedIn = cookies.includes('admin_logged_in=true');
    
    if (isLoggedIn) {
      return res.json({ ok: true, authenticated: true });
    } else {
      return res.status(401).json({ ok: false, authenticated: false });
    }
  }

  // 设置状态
  if (method === 'POST' && action === 'set-state') {
    const cookies = req.headers.cookie || '';
    const isLoggedIn = cookies.includes('admin_logged_in=true');
    
    if (!isLoggedIn) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }
    
    const { state } = req.body || {};
    if (['waiting', 'open', 'closed'].includes(state)) {
      currentState = state;
      console.log('State updated to:', currentState);
      return res.json({ ok: true, state: currentState });
    } else {
      return res.status(400).json({ ok: false, error: 'Invalid state' });
    }
  }

  // 获取参与者列表（模拟数据）
  if (method === 'GET' && action === 'participants') {
    const cookies = req.headers.cookie || '';
    const isLoggedIn = cookies.includes('admin_logged_in=true');
    
    if (!isLoggedIn) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }

    return res.json({
      total: 0,
      items: [],
      state: currentState,
      stats: {
        total: 0,
        participated: 0,
        winners: 0,
        pending: 0
      },
      config: currentConfig
    });
  }

  // 重置所有数据（模拟）
  if (method === 'POST' && action === 'reset-all') {
    const cookies = req.headers.cookie || '';
    const isLoggedIn = cookies.includes('admin_logged_in=true');
    
    if (!isLoggedIn) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }

    console.log('Reset all data (mock)');
    return res.json({ ok: true, message: 'All data reset' });
  }

  // 配置管理（模拟）
  if (action === 'config') {
    const cookies = req.headers.cookie || '';
    const isLoggedIn = cookies.includes('admin_logged_in=true');
    
    if (!isLoggedIn) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }

    if (method === 'GET') {
      // 返回当前配置
      return res.json(currentConfig);
    } else if (method === 'POST') {
      // 更新配置
      const { hongzhongPercent, redCountMode } = req.body || {};
      
      if (typeof hongzhongPercent === 'number' && hongzhongPercent >= 0 && hongzhongPercent <= 100) {
        currentConfig.hongzhongPercent = hongzhongPercent;
      }
      if (typeof redCountMode === 'number' && [0, 1, 2, 3].includes(redCountMode)) {
        currentConfig.redCountMode = redCountMode;
      }
      
      console.log('Config updated to:', currentConfig);
      return res.json({ ok: true, config: currentConfig });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
