import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  return res.status(404).json({ error: 'Not found' });
}
