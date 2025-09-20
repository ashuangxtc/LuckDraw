import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage, type Participant } from './_lib/storage';
import { requireAdmin } from './_lib/auth';
import { parseCookies, setCookie } from './_lib/utils';
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Dreammore123';
const ADMIN_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 小时

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;
  const pathSegments = req.url?.split('/').filter(Boolean) || [];
  const action = pathSegments[pathSegments.length - 1] || pathSegments[1];

  // 登录 - POST /api/admin?action=login
  if (method === 'POST' && (action === 'login' || req.query.action === 'login')) {
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
      return res.json({ ok: true, expiresAt });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 登出 - POST /api/admin?action=logout
  if (method === 'POST' && (action === 'logout' || req.query.action === 'logout')) {
    try {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies.admin_session;
      
      if (token) {
        await storage.deleteAdminSession(token);
      }
      
      res.setHeader('Set-Cookie', 'admin_session=; HttpOnly; Max-Age=0; SameSite=Lax; Path=/');
      return res.json({ ok: true });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 获取管理员状态 - GET /api/admin?action=me 或 GET /api/admin/me
  if (method === 'GET' && (action === 'me' || req.query.action === 'me')) {
    try {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies.admin_session;
      
      if (!token) {
        return res.status(401).json({ ok: false });
      }
      
      const expiresAt = await storage.getAdminSession(token);
      
      if (!expiresAt || Date.now() > expiresAt) {
        await storage.deleteAdminSession(token);
        res.setHeader('Set-Cookie', 'admin_session=; HttpOnly; Max-Age=0; SameSite=Lax; Path=/');
        return res.status(401).json({ ok: false, error: 'SESSION_EXPIRED' });
      }
      
      return res.json({ ok: true, expiresAt });
    } catch (error) {
      console.error('Me error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 以下需要管理员权限
  if (!(await requireAdmin(req, res))) {
    return;
  }

  // 设置活动状态 - POST /api/admin?action=set-state
  if (method === 'POST' && (action === 'set-state' || req.query.action === 'set-state')) {
    try {
      const { state } = req.body;
      
      if (!['waiting', 'open', 'closed'].includes(state)) {
        return res.status(400).json({ error: 'INVALID_STATE' });
      }
      
      const prevState = await storage.getActivityState();
      await storage.setActivityState(state);
      
      console.log(`管理员设置活动状态: ${prevState} -> ${state}`);
      return res.json({ ok: true, state });
    } catch (error) {
      console.error('Set state error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 获取参与者列表 - GET /api/admin?action=participants
  if (method === 'GET' && (action === 'participants' || req.query.action === 'participants')) {
    try {
      const participants = await storage.getAllParticipants();
      const activityState = await storage.getActivityState();
      const config = await storage.getActivityConfig();
      
      const all = participants
        .sort((a, b) => a.pid - b.pid)
        .map(p => ({
          ...p,
          clientIdShort3: p.clientId ? (p.clientId.slice(-3).padStart(3,'0')) : null,
          status: p.participated ? (p.win ? '已中奖' : '未中奖') : '未参与',
          joinTime: new Date(p.joinedAt).toLocaleString('zh-CN'),
          drawTime: p.drawAt ? new Date(p.drawAt).toLocaleString('zh-CN') : null
        }));
      
      const stats = {
        total: all.length,
        participated: all.filter(p => p.participated).length,
        winners: all.filter(p => p.win === true).length,
        pending: all.filter(p => !p.participated).length
      };
      
      return res.json({ 
        total: all.length, 
        items: all,
        state: activityState,
        config,
        stats
      });
    } catch (error) {
      console.error('Participants error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 重置所有数据 - POST /api/admin?action=reset-all
  if (method === 'POST' && (action === 'reset-all' || req.query.action === 'reset-all')) {
    try {
      await storage.resetAll();
      console.log('管理员重置所有数据');
      return res.json({ ok: true });
    } catch (error) {
      console.error('Reset all error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 重置单个参与者 - POST /api/admin?action=reset&pid=123
  if (method === 'POST' && (action === 'reset' || req.query.action === 'reset')) {
    try {
      const pid = Number(req.query.pid);
      
      if (isNaN(pid)) {
        return res.status(400).json({ error: 'Invalid PID' });
      }

      const existingParticipant = await storage.getParticipant(pid);
      
      if (existingParticipant) {
        const resetParticipant: Participant = {
          pid: pid,
          clientId: existingParticipant.clientId,
          participated: false,
          joinedAt: existingParticipant.joinedAt,
          win: undefined,
          drawAt: undefined
        };
        
        await storage.setParticipant(resetParticipant);
        console.log(`管理员重置PID ${pid}`);
        return res.json({ ok: true, pid, message: `已重置参与者 ${pid}` });
      } else {
        const newParticipant: Participant = { 
          pid, 
          participated: false, 
          joinedAt: Date.now() 
        };
        await storage.setParticipant(newParticipant);
        return res.json({ ok: true, pid, message: `已创建参与者 ${pid}` });
      }
    } catch (error) {
      console.error('Reset participant error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
