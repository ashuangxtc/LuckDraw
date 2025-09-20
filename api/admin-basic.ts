import type { VercelRequest, VercelResponse } from '@vercel/node';

// 内联状态存储，避免导入问题
let currentState: 'waiting' | 'open' | 'closed' = 'waiting';
let currentConfig = {
  hongzhongPercent: 33,
  redCountMode: 1
};

// 参与者记录
let participants: Record<string, {
  pid: number;
  participated: boolean;
  win: boolean;
  joinTime: string;
}> = {};

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  // 管理员登录
  if (method === 'POST' && action === 'login') {
    try {
      const { password } = req.body || {};
      console.log('Login attempt received');
      
      const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';
      
      if (password === expectedPassword) {
        res.setHeader('Set-Cookie', 'admin_logged_in=true; HttpOnly; Path=/; Max-Age=3600');
        console.log('Admin login successful');
        return res.json({ ok: true, message: 'Login successful' });
      } else {
        console.log('Admin login failed - wrong password');
        return res.status(401).json({ ok: false, error: 'Invalid password' });
      }
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ ok: false, error: 'Login failed' });
    }
  }

  // 管理员登出
  if (method === 'POST' && action === 'logout') {
    res.setHeader('Set-Cookie', 'admin_logged_in=; HttpOnly; Path=/; Max-Age=0');
    return res.json({ ok: true, message: 'Logout successful' });
  }

  // 检查管理员状态
  if (method === 'GET' && action === 'me') {
    const cookies = req.headers.cookie || '';
    const isLoggedIn = cookies.includes('admin_logged_in=true');
    return res.json({ loggedIn: isLoggedIn });
  }

  // 设置游戏状态
  if (method === 'POST' && action === 'set-state') {
    const cookies = req.headers.cookie || '';
    const isLoggedIn = cookies.includes('admin_logged_in=true');
    
    if (!isLoggedIn) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }

    const { state } = req.body || {};
    if (state && ['waiting', 'open', 'closed'].includes(state)) {
      currentState = state;
      console.log('Admin set state to:', state);
      return res.json({ ok: true, state: currentState });
    }
    
    return res.status(400).json({ ok: false, error: 'Invalid state' });
  }

  // 获取参与者列表
  if (method === 'GET' && action === 'participants') {
    const cookies = req.headers.cookie || '';
    const isLoggedIn = cookies.includes('admin_logged_in=true');
    
    if (!isLoggedIn) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }

    const participantList = Object.values(participants);
    return res.json({
      ok: true,
      participants: participantList.map(p => ({
        pid: p.pid,
        participated: p.participated,
        win: p.win,
        joinTime: p.joinTime
      })),
      stats: {
        total: participantList.length,
        participated: participantList.filter(p => p.participated).length,
        winners: participantList.filter(p => p.win).length
      },
      state: currentState,
      config: currentConfig
    });
  }

  // 重置所有数据
  if (method === 'POST' && action === 'reset-all') {
    const cookies = req.headers.cookie || '';
    const isLoggedIn = cookies.includes('admin_logged_in=true');
    
    if (!isLoggedIn) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }

    // 清除admin数据
    Object.keys(participants).forEach(key => delete participants[key]);
    currentState = 'waiting';
    currentConfig = { hongzhongPercent: 33, redCountMode: 1 };
    
    console.log('Admin data reset completed');
    return res.json({ ok: true, message: 'Data reset successfully' });
  }

  // 配置管理
  if (action === 'config') {
    const cookies = req.headers.cookie || '';
    const isLoggedIn = cookies.includes('admin_logged_in=true');
    
    if (!isLoggedIn) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }

    if (method === 'GET') {
      return res.json({ 
        ok: true, 
        config: currentConfig 
      });
    }
    
    if (method === 'POST') {
      const { hongzhongPercent, redCountMode } = req.body || {};
      
      if (typeof hongzhongPercent === 'number' && hongzhongPercent >= 0 && hongzhongPercent <= 100) {
        currentConfig.hongzhongPercent = hongzhongPercent;
      }
      if (typeof redCountMode === 'number' && redCountMode >= 1) {
        currentConfig.redCountMode = redCountMode;
      }
      
      console.log('Config updated:', currentConfig);
      return res.json({ 
        ok: true, 
        config: currentConfig 
      });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}