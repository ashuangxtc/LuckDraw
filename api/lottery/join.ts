import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage, type Participant } from '../_lib/storage';
import { readClientId, parseCookies, setCookie } from '../_lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clientId = readClientId(req);
    const cookies = parseCookies(req.headers.cookie);
    let pid = Number(cookies.pid);
    if (Number.isNaN(pid)) pid = undefined as any;

    // 如果带了 clientId，优先用 clientId 找已存在的参与者
    if (clientId) {
      const existingParticipant = await storage.getParticipantByClientId(clientId);
      if (existingParticipant) {
        // 设置 cookie
        const cookieHeader = setCookie('pid', String(existingParticipant.pid), {
          httpOnly: true,
          maxAge: 7 * 24 * 3600,
          sameSite: 'Lax',
          path: '/'
        });
        res.setHeader('Set-Cookie', cookieHeader);
        return res.json({ 
          pid: existingParticipant.pid, 
          participated: existingParticipant.participated, 
          win: existingParticipant.win === true 
        });
      }
    }

    // 如果有 pid，查找现有参与者
    if (pid != null) {
      const existingParticipant = await storage.getParticipant(pid);
      if (existingParticipant) {
        // 如果此次带了 clientId，则建立关联
        if (clientId && !existingParticipant.clientId) {
          existingParticipant.clientId = clientId;
          await storage.setParticipant(existingParticipant);
        }
        return res.json({ 
          pid, 
          participated: existingParticipant.participated, 
          win: existingParticipant.win === true 
        });
      }
    }

    // 创建新参与者
    const newPid = await storage.getNextPid();
    const record: Participant = {
      pid: newPid,
      clientId,
      participated: false,
      joinedAt: Date.now()
    };
    
    await storage.setParticipant(record);
    
    // 设置 cookie
    const cookieHeader = setCookie('pid', String(newPid), {
      httpOnly: true,
      maxAge: 7 * 24 * 3600,
      sameSite: 'Lax',
      path: '/'
    });
    res.setHeader('Set-Cookie', cookieHeader);
    
    return res.json({ pid: newPid, participated: false, win: false });
  } catch (error) {
    console.error('Join error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
