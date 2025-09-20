import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Dreammore123';
const ADMIN_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 小时

// 简单的内存会话存储（用于测试）
const adminSessions = new Map<string, number>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;
  const action = req.query.action as string;

  // 登录测试
  if (method === 'POST' && action === 'login') {
    try {
      const { password } = req.body || {};
      
      console.log('Login attempt:', { 
        receivedPassword: password ? 'PROVIDED' : 'NOT_PROVIDED',
        expectedPassword: ADMIN_PASSWORD ? 'SET' : 'NOT_SET'
      });
      
      if (String(password || '') !== String(ADMIN_PASSWORD)) {
        return res.status(401).json({ 
          ok: false, 
          error: 'INVALID_PASSWORD',
          debug: {
            passwordProvided: !!password,
            adminPasswordSet: !!ADMIN_PASSWORD
          }
        });
      }
      
      const token = crypto.randomUUID();
      const expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
      
      adminSessions.set(token, expiresAt);
      
      res.setHeader('Set-Cookie', `admin_session=${token}; HttpOnly; Max-Age=${Math.floor(ADMIN_SESSION_TTL_MS / 1000)}; SameSite=Lax; Path=/`);
      
      return res.json({ 
        ok: true, 
        expiresAt,
        message: 'Login successful'
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
