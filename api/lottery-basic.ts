import type { VercelRequest, VercelResponse } from '@vercel/node';

// 内联状态存储，避免导入问题  
let currentState: 'waiting' | 'open' | 'closed' = 'waiting';
let currentConfig = {
  hongzhongPercent: 33,
  redCountMode: 1
};

// 参与者记录
let participants: Record<string, {
  pid: number;
  participated: boolean;
  win: boolean;
  joinTime: string;
}> = {};

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const action = query.action as string;

  // 获取活动状态 - GET /api/lottery-basic?action=status
  if (method === 'GET' && action === 'status') {
    const participantList = Object.values(participants);
    return res.json({
      open: currentState === 'open',
      state: currentState,
      redCountMode: currentConfig.redCountMode,
      config: currentConfig,
      stats: {
        totalParticipants: participantList.length,
        participated: participantList.filter(p => p.participated).length,
        winners: participantList.filter(p => p.win).length
      },
      timestamp: new Date().toISOString()
    });
  }

  // 获取参与者列表 - GET /api/lottery-basic?action=participants
  if (method === 'GET' && action === 'participants') {
    const participantList = Object.values(participants);
    return res.json({
      ok: true,
      participants: participantList.map(p => ({
        pid: p.pid,
        participated: p.participated,
        win: p.win,
        joinTime: p.joinTime
      })),
      stats: {
        total: participantList.length,
        participated: participantList.filter(p => p.participated).length,
        winners: participantList.filter(p => p.win).length
      },
      state: currentState,
      config: currentConfig
    });
  }

  // 获取配置 - GET /api/lottery-basic?action=config  
  if (method === 'GET' && action === 'config') {
    return res.json(currentConfig);
  }

  // 健康检查
  if (method === 'GET' && action === 'health') {
    return res.json({
      ok: true,
      message: 'Lottery API is working',
      state: currentState,
      timestamp: new Date().toISOString()
    });
  }

  // 设置游戏状态 - POST /api/lottery-basic?action=set-state
  if (method === 'POST' && action === 'set-state') {
    const { state } = req.body || {};
    console.log('Set-state request received:', { state, currentState });
    if (state && ['waiting', 'open', 'closed'].includes(state)) {
      const oldState = currentState;
      currentState = state;
      console.log('Lottery state changed:', { from: oldState, to: state, timestamp: new Date().toISOString() });
      return res.json({
        ok: true,
        state: currentState,
        timestamp: new Date().toISOString()
      });
    }
    console.log('Invalid state requested:', state);
    return res.status(400).json({ error: 'Invalid state' });
  }

  // 参与抽奖 - POST /api/lottery-basic?action=join
  if (method === 'POST' && action === 'join') {
    // 尝试从请求体获取前端提供的PID
    const { clientPid } = req.body || {};
    
    // 如果前端提供了有效的PID，先尝试找到对应的参与者
    if (clientPid && typeof clientPid === 'number' && clientPid >= 100 && clientPid <= 999) {
      const existingParticipant = Object.values(participants).find(p => p.pid === clientPid);
      if (existingParticipant) {
        return res.json({
          pid: existingParticipant.pid,
          participated: existingParticipant.participated,
          win: existingParticipant.win
        });
      } else {
        console.log('前端提供的PID未找到对应参与者:', { clientPid });
      }
    }
    
    // 如果没有找到，使用客户端特征作为标识
    const userAgent = req.headers['user-agent'] || '';
    const forwardedFor = req.headers['x-forwarded-for'] || '';
    const realIp = req.headers['x-real-ip'] || '';
    const clientId = `${userAgent}_${forwardedFor}_${realIp}`.substring(0, 100); // 限制长度
    
    let participant = participants[clientId];
    if (!participant) {
      // 生成3位数PID，确保唯一性
      let pid;
      const existingParticipants = Object.values(participants);
      do {
        pid = Math.floor(Math.random() * 900) + 100; // 100-999
      } while (existingParticipants.some(p => p.pid === pid));
      
      participant = {
        pid: pid,
        participated: false,
        win: false,
        joinTime: new Date().toISOString()
      };
      participants[clientId] = participant;
      console.log('新参与者创建:', { pid: participant.pid });
    }
    
    return res.json({
      pid: participant.pid,
      participated: participant.participated,
      win: participant.win
    });
  }

  // 抽奖 - POST /api/lottery-basic?action=draw
  if (method === 'POST' && action === 'draw') {
    console.log('抽奖请求 - 当前状态:', currentState);
    
    if (currentState !== 'open') {
      return res.status(400).json({ 
        ok: false, 
        error: 'Activity not open',
        state: currentState 
      });
    }

    const { clientId, pid } = req.body || {};
    
    if (!clientId || !pid) {
      return res.status(400).json({ ok: false, error: 'Missing clientId or pid' });
    }

    let participant = participants[clientId];
    
    // 如果没有找到，尝试通过PID找到参与者
    if (!participant) {
      const allParticipants = Object.values(participants);
      const foundByPid = allParticipants.find(p => p.pid === pid);
      if (foundByPid) {
        participant = foundByPid;
        // 更新clientId映射
        participants[clientId] = participant;
      }
    }

    if (!participant) {
      return res.status(404).json({ ok: false, error: 'Participant not found' });
    }

    if (participant.participated) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Already participated',
        participated: true 
      });
    }

    // 标记为已参与
    participant.participated = true;
    participants[clientId] = participant;

    console.log('抽奖执行 - PID:', pid);
    return res.json({ 
      ok: true, 
      participated: true,
      pid: participant.pid
    });
  }

  // 发牌 - POST /api/lottery-basic?action=deal
  if (method === 'POST' && action === 'deal') {
    const { redCount = currentConfig.redCountMode } = req.body || {};
    
    // 生成随机牌组
    const totalCards = 9;
    const faces: ('zhong' | 'blank')[] = [];
    
    // 添加红中
    for (let i = 0; i < Math.min(redCount, totalCards); i++) {
      faces.push('zhong');
    }
    
    // 添加白板
    for (let i = faces.length; i < totalCards; i++) {
      faces.push('blank');
    }
    
    // 洗牌
    for (let i = faces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [faces[i], faces[j]] = [faces[j], faces[i]];
    }
    
    console.log('发牌完成:', { redCount, faces });
    
    return res.json({
      ok: true,
      faces,
      redCount: faces.filter(f => f === 'zhong').length,
      totalCards: faces.length
    });
  }

  // 翻牌 - POST /api/lottery-basic?action=pick
  if (method === 'POST' && action === 'pick') {
    const { clientId, pid, cardIndex } = req.body || {};
    
    if (currentState !== 'open') {
      return res.status(400).json({ 
        ok: false, 
        error: 'Activity not open' 
      });
    }

    if (!clientId || !pid || typeof cardIndex !== 'number') {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing required parameters' 
      });
    }

    let participant = participants[clientId];
    
    if (!participant) {
      const allParticipants = Object.values(participants);
      const foundByPid = allParticipants.find(p => p.pid === pid);
      if (foundByPid) {
        participant = foundByPid;
        participants[clientId] = participant;
      }
    }

    if (!participant) {
      return res.status(404).json({ 
        ok: false, 
        error: 'Participant not found' 
      });
    }

    if (!participant.participated) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Must draw first' 
      });
    }

    // 这里应该根据实际的牌组数据来判断是否中奖
    // 暂时使用随机逻辑作为示例
    const isWin = Math.random() < (currentConfig.hongzhongPercent / 100);
    
    participant.win = isWin;
    participants[clientId] = participant;

    console.log('翻牌结果:', { pid, cardIndex, isWin });

    return res.json({
      ok: true,
      win: isWin,
      pid: participant.pid,
      cardIndex
    });
  }

  // 重置指定参与者
  if (method === 'DELETE' && action === 'reset-participant') {
    const pidToReset = parseInt(query.pid as string);
    
    if (!pidToReset) {
      return res.status(400).json({ ok: false, error: 'Invalid PID' });
    }

    // 查找并重置参与者
    let found = false;
    for (const [clientId, participant] of Object.entries(participants)) {
      if (participant.pid === pidToReset) {
        participant.participated = false;
        participant.win = false;
        participants[clientId] = participant;
        found = true;
        break;
      }
    }

    if (found) {
      console.log('参与者重置:', pidToReset);
      return res.json({ ok: true, message: `Participant ${pidToReset} reset` });
    } else {
      return res.json({ ok: true, message: 'Participant not found' });
    }
  }

  // 同步状态 - POST /api/lottery-basic?action=sync-state
  if (method === 'POST' && action === 'sync-state') {
    const { state, config } = req.body || {};
    
    if (state && ['waiting', 'open', 'closed'].includes(state)) {
      currentState = state;
      console.log('Lottery state synced to:', currentState);
    }
    
    if (config) {
      if (typeof config.hongzhongPercent === 'number') {
        currentConfig.hongzhongPercent = config.hongzhongPercent;
      }
      if (typeof config.redCountMode === 'number') {
        currentConfig.redCountMode = config.redCountMode;
      }
      console.log('Lottery config synced to:', currentConfig);
    }
    
    return res.json({
      ok: true,
      state: currentState,
      config: currentConfig
    });
  }

  // 重置所有数据 - POST /api/lottery-basic?action=reset-all  
  if (method === 'POST' && action === 'reset-all') {
    console.log('RESET-ALL triggered! Current state was:', currentState);
    console.log('Request origin:', req.headers['user-agent'], req.headers['referer']);
    
    // 清除所有参与者数据
    Object.keys(participants).forEach(key => delete participants[key]);
    currentState = 'waiting';
    currentConfig = { hongzhongPercent: 33, redCountMode: 1 };
    
    console.log('Lottery data reset - all participants cleared, state reset to waiting');
    return res.json({ ok: true, message: 'Lottery data reset successfully' });
  }

  return res.status(404).json({ error: 'Not found' });
}