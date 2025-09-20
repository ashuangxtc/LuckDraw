import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage, type Participant } from '../_lib/storage';
import { readClientId, parseCookies, sampleFacesByCount } from '../_lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 检查活动状态
    const activityState = await storage.getActivityState();
    if (activityState !== 'open') {
      return res.status(403).json({ error: 'ACTIVITY_NOT_OPEN', state: activityState });
    }

    // 获取参与者信息
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

    // 如果仍不存在且提供了 clientId，则为其分配一个参与者记录
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
      
      // 设置 cookie
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

    // 获取选择的牌索引
    const choice = (req.body?.choice ?? req.body?.pick ?? 0) as number;
    
    // 获取活动配置并生成牌面排列
    const config = await storage.getActivityConfig();
    const faces = sampleFacesByCount(config.redCountMode);
    const win = faces[choice] === 'zhong';
    
    console.log(`PID ${pid} 抽奖详情: 选择位置${choice}, 牌面[${faces.join(',')}], 选中${faces[choice]}, 结果${win ? '中奖' : '未中奖'}, redCountMode=${config.redCountMode}`);
    
    // 更新参与者信息
    participant.participated = true;
    participant.win = win;
    participant.drawAt = Date.now();
    await storage.setParticipant(participant);
    
    // 返回兼容格式 + 扩展字段
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
