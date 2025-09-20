import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseCookies, setCookie } from './_lib/utils';
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Dreammore123';
const ADMIN_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 小时

// 临时使用内存存储（用于测试）
const adminSessions = new Map<string, number>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;
  const action = req.query.action as string;

  try {
    // 登录 - POST /api/admin?action=login
    if (method === 'POST' && action === 'login') {
      const { password } = req.body || {};
      
      console.log('Login attempt:', {
        hasPassword: !!password,
        hasAdminPassword: !!ADMIN_PASSWORD
      });
      
      if (String(password || '') !== String(ADMIN_PASSWORD)) {
        return res.status(401).json({ ok: false, error: 'INVALID_PASSWORD' });
      }
      
      const token = crypto.randomUUID();
      const expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
      
      adminSessions.set(token, expiresAt);
      
      const cookieHeader = setCookie('admin_session', token, {
        httpOnly: true,
        maxAge: Math.floor(ADMIN_SESSION_TTL_MS / 1000),
        sameSite: 'Lax',
        path: '/'
      });
      
      res.setHeader('Set-Cookie', cookieHeader);
      return res.json({ ok: true, expiresAt });
    }

    // 登出 - POST /api/admin?action=logout
    if (method === 'POST' && action === 'logout') {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies.admin_session;
      
      if (token) {
        adminSessions.delete(token);
      }
      
      res.setHeader('Set-Cookie', 'admin_session=; HttpOnly; Max-Age=0; SameSite=Lax; Path=/');
      return res.json({ ok: true });
    }

    // 获取管理员状态 - GET /api/admin?action=me
    if (method === 'GET' && action === 'me') {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies.admin_session;
      
      if (!token) {
        return res.status(401).json({ ok: false });
      }
      
      const expiresAt = adminSessions.get(token);
      
      if (!expiresAt || Date.now() > expiresAt) {
        adminSessions.delete(token);
        res.setHeader('Set-Cookie', 'admin_session=; HttpOnly; Max-Age=0; SameSite=Lax; Path=/');
        return res.status(401).json({ ok: false, error: 'SESSION_EXPIRED' });
      }
      
      return res.json({ ok: true, expiresAt });
    }

    // 其他操作暂时返回成功（用于测试）
    if (method === 'POST' && action === 'set-state') {
      return res.json({ ok: true, message: 'State set (mock)' });
    }

    if (method === 'GET' && action === 'participants') {
      return res.json({ 
        total: 0, 
        items: [],
        stats: { total: 0, participated: 0, winners: 0, pending: 0 }
      });
    }

    if (method === 'POST' && action === 'reset-all') {
      return res.json({ ok: true, message: 'Reset completed (mock)' });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}