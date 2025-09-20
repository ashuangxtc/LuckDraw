import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 调试登录请求
  if (method === 'POST') {
    console.log('=== DEBUG LOGIN ===');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Query:', query);
    console.log('Method:', method);
    
    const { password } = req.body || {};
    const expectedPassword = process.env.ADMIN_PASSWORD || 'Dreammore123';
    
    console.log('Received password:', password);
    console.log('Expected password:', expectedPassword);
    console.log('Password match:', password === expectedPassword);
    console.log('Password type:', typeof password);
    console.log('Expected type:', typeof expectedPassword);
    
    if (password === expectedPassword) {
      console.log('✅ Password match - setting cookie');
      res.setHeader('Set-Cookie', 'admin_logged_in=true; HttpOnly; Max-Age=7200; SameSite=Lax; Path=/');
      return res.json({ 
        ok: true, 
        message: 'Login successful',
        debug: {
          receivedPassword: password,
          expectedPassword: expectedPassword,
          match: true
        }
      });
    } else {
      console.log('❌ Password mismatch');
      return res.status(401).json({ 
        ok: false, 
        error: 'Invalid password',
        debug: {
          receivedPassword: password,
          expectedPassword: expectedPassword,
          match: false
        }
      });
    }
  }
  
  // 检查环境变量
  if (method === 'GET') {
    return res.json({
      adminPassword: process.env.ADMIN_PASSWORD || 'undefined',
      nodeEnv: process.env.NODE_ENV || 'undefined',
      hasAdminPassword: !!process.env.ADMIN_PASSWORD,
      defaultPassword: 'Dreammore123'
    });
  }
  
  return res.status(404).json({ error: 'Not found' });
}
