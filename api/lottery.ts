import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage, type Participant } from './_lib/storage';
import { readClientId, parseCookies, setCookie, generateRoundId, sampleFacesByCount } from './_lib/utils';
import { requireAdmin } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;
  const pathSegments = req.url?.split('/').filter(Boolean) || [];
  const action = pathSegments[pathSegments.length - 1] || req.query.action;

  // 加入抽奖 - POST /api/lottery?action=join
  if (method === 'POST' && (action === 'join' || req.query.action === 'join')) {
    try {
      const clientId = readClientId(req);
      const cookies = parseCookies(req.headers.cookie);
      let pid = Number(cookies.pid);
      if (Number.isNaN(pid)) pid = undefined as any;

      // 如果带了 clientId，优先用 clientId 找已存在的参与者
      if (clientId) {
        const existingParticipant = await storage.getParticipantByClientId(clientId);
        if (existingParticipant) {
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

  // 抽奖 - POST /api/lottery?action=draw
  if (method === 'POST' && (action === 'draw' || req.query.action === 'draw')) {
    try {
      const activityState = await storage.getActivityState();
      if (activityState !== 'open') {
        return res.status(403).json({ error: 'ACTIVITY_NOT_OPEN', state: activityState });
      }

      const clientId = readClientId(req);
      const cookies = parseCookies(req.headers.cookie);
      let pid = Number(cookies.pid);
      let participant: Participant | null = null;

      if (!Number.isNaN(pid)) {
        participant = await storage.getParticipant(pid);
      }

      if (!participant && clientId) {
        participant = await storage.getParticipantByClientId(clientId);
        if (participant) {
          pid = participant.pid;
        }
      }

      if (!participant && clientId) {
        const newPid = await storage.getNextPid();
        const record: Participant = { 
          pid: newPid, 
          clientId, 
          participated: false, 
          joinedAt: Date.now() 
        };
        await storage.setParticipant(record);
        participant = record;
        pid = newPid;
        
        res.setHeader('Set-Cookie', `pid=${newPid}; HttpOnly; Max-Age=${7*24*3600}; SameSite=Lax; Path=/`);
      }

      if (!participant) {
        return res.status(400).json({ error: 'NO_PID' });
      }

      if (participant.participated) {
        return res.status(409).json({ 
          ok: false, 
          error: 'ALREADY_PARTICIPATED', 
          pid, 
          win: participant.win 
        });
      }

      const choice = (req.body?.choice ?? req.body?.pick ?? 0) as number;
      const config = await storage.getActivityConfig();
      const faces = sampleFacesByCount(config.redCountMode);
      const win = faces[choice] === 'zhong';
      
      console.log(`PID ${pid} 抽奖详情: 选择位置${choice}, 牌面[${faces.join(',')}], 选中${faces[choice]}, 结果${win ? '中奖' : '未中奖'}, redCountMode=${config.redCountMode}`);
      
      participant.participated = true;
      participant.win = win;
      participant.drawAt = Date.now();
      await storage.setParticipant(participant);
      
      const faceLabel = faces[choice] === 'zhong' ? '红中' : '白板';
      const winIndex = faces.findIndex(f => f === 'zhong');
      
      return res.json({ 
        ok: true,
        pid, 
        win, 
        isWinner: win, 
        label: faceLabel,
        deck: faces.map(f => f === 'zhong' ? 'hongzhong' : 'baiban'),
        winIndex: win ? choice : (winIndex >= 0 ? winIndex : undefined)
      });
    } catch (error) {
      console.error('Draw error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 获取状态 - GET /api/lottery?action=status
  if (method === 'GET' && (action === 'status' || req.query.action === 'status')) {
    try {
      const activityState = await storage.getActivityState();
      const config = await storage.getActivityConfig();
      const participants = await storage.getAllParticipants();
      
      const stats = {
        totalParticipants: participants.length,
        participated: participants.filter(p => p.participated).length,
        winners: participants.filter(p => p.win === true).length
      };

      return res.json({ 
        open: activityState === 'open',
        state: activityState,
        redCountMode: config.redCountMode,
        config,
        stats
      });
    } catch (error) {
      console.error('Status error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 发牌 - POST /api/lottery?action=deal
  if (method === 'POST' && (action === 'deal' || req.query.action === 'deal')) {
    try {
      const activityState = await storage.getActivityState();
      if (activityState !== 'open') {
        return res.status(403).json({ error: 'ACTIVITY_NOT_OPEN' });
      }
      
      const config = await storage.getActivityConfig();
      const faces = sampleFacesByCount(config.redCountMode);
      const roundId = generateRoundId();
      
      await storage.setRound(roundId, { faces, createdAt: Date.now() });
      
      console.log(`发牌: roundId=${roundId}, faces=[${faces.join(',')}], redCountMode=${config.redCountMode}`);
      return res.json({ roundId, faces });
    } catch (error) {
      console.error('Deal error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 选牌 - POST /api/lottery?action=pick
  if (method === 'POST' && (action === 'pick' || req.query.action === 'pick')) {
    try {
      const { roundId, index } = req.body || {};
      const round = await storage.getRound(roundId);
      
      if (!round) {
        return res.status(404).json({ error: 'ROUND_NOT_FOUND' });
      }
      
      const face = round.faces[index] || 'blank';
      const win = face === 'zhong';
      await storage.deleteRound(roundId);
      
      console.log(`选牌: roundId=${roundId}, index=${index}, face=${face}, win=${win}`);
      return res.json({ win, face, faces: round.faces });
    } catch (error) {
      console.error('Pick error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 配置管理 - GET/POST /api/lottery?action=config
  if (action === 'config' || req.query.action === 'config') {
    if (method === 'GET') {
      try {
        const config = await storage.getActivityConfig();
        return res.json(config);
      } catch (error) {
        console.error('Get config error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    } else if (method === 'POST') {
      if (!(await requireAdmin(req, res))) {
        return;
      }

      try {
        const { redCountMode } = req.body;
        
        if (![0, 1, 2, 3].includes(Number(redCountMode))) {
          return res.status(400).json({ error: 'redCountMode must be 0|1|2|3' });
        }
        
        const config = await storage.getActivityConfig();
        const prevMode = config.redCountMode;
        config.redCountMode = Number(redCountMode);
        
        await storage.setActivityConfig(config);
        
        console.log(`管理员更新红中张数: ${prevMode} -> ${redCountMode}`);
        return res.json({ ok: true, redCountMode: config.redCountMode });
      } catch (error) {
        console.error('Set config error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
