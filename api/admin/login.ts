import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage';
import { setCookie } from '../_lib/utils';
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Dreammore123';
const ADMIN_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 小时

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password } = req.body || {};
    
    if (String(password || '') !== String(ADMIN_PASSWORD)) {
      return res.status(401).json({ ok: false, error: 'INVALID_PASSWORD' });
    }
    
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
    
    await storage.setAdminSession(token, expiresAt);
    
    const cookieHeader = setCookie('admin_session', token, {
      httpOnly: true,
      maxAge: Math.floor(ADMIN_SESSION_TTL_MS / 1000),
      sameSite: 'Lax',
      path: '/'
    });
    
    res.setHeader('Set-Cookie', cookieHeader);
    res.json({ ok: true, expiresAt });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
