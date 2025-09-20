import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from './storage';
import { parseCookies } from './utils';

const ADMIN_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 小时

export async function requireAdmin(req: VercelRequest, res: VercelResponse): Promise<boolean> {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.admin_session;
    
    if (!token) {
      res.status(401).json({ ok: false, error: 'ADMIN_REQUIRED' });
      return false;
    }
    
    const expiresAt = await storage.getAdminSession(token);
    
    if (!expiresAt || Date.now() > expiresAt) {
      await storage.deleteAdminSession(token);
      res.setHeader('Set-Cookie', 'admin_session=; HttpOnly; Max-Age=0; SameSite=Lax; Path=/');
      res.status(401).json({ ok: false, error: 'SESSION_EXPIRED' });
      return false;
    }
    
    // 滑动续期：访问刷新过期时间
    const newExpiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
    await storage.setAdminSession(token, newExpiresAt);
    
    return true;
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
    return false;
  }
}
