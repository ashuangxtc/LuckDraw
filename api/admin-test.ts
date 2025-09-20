import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const action = query.action as string;

  console.log('Admin test API called:', { method, action, body: req.body });

  // 健康检查
  if (method === 'GET' && action === 'health') {
    return res.json({ 
      ok: true, 
      message: 'Admin test API is working',
      timestamp: new Date().toISOString()
    });
  }

  // 管理员登录测试
  if (method === 'POST' && action === 'login') {
    try {
      const { password } = req.body || {};
      console.log('Test login attempt, password provided:', !!password, 'length:', password?.length);
      
      const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';
      console.log('Expected password length:', expectedPassword.length);
      
      if (password === expectedPassword) {
        res.setHeader('Set-Cookie', 'admin_logged_in=true; HttpOnly; Path=/; Max-Age=3600');
        console.log('Test admin login successful');
        return res.json({ ok: true, message: 'Test login successful' });
      } else {
        console.log('Test admin login failed - password mismatch');
        console.log('Received:', password ? `"${password}"` : 'undefined');
        console.log('Expected:', `"${expectedPassword}"`);
        return res.status(401).json({ ok: false, error: 'Invalid password' });
      }
    } catch (error) {
      console.error('Test login error:', error);
      return res.status(500).json({ ok: false, error: 'Login failed', details: error.message });
    }
  }

  // 检查管理员状态
  if (method === 'GET' && action === 'me') {
    const cookies = req.headers.cookie || '';
    const isLoggedIn = cookies.includes('admin_logged_in=true');
    console.log('Test auth check, cookies:', cookies, 'logged in:', isLoggedIn);
    return res.json({ loggedIn: isLoggedIn });
  }

  return res.status(404).json({ error: 'Test endpoint not found' });
}
