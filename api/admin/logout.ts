import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage';
import { parseCookies } from '../_lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.admin_session;
    
    if (token) {
      await storage.deleteAdminSession(token);
    }
    
    res.setHeader('Set-Cookie', 'admin_session=; HttpOnly; Max-Age=0; SameSite=Lax; Path=/');
    res.json({ ok: true });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
