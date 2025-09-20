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
    return res.json({
      open: currentState === 'open',
      state: currentState,
      redCountMode: currentConfig.redCountMode,
      config: currentConfig,
      stats: {
        totalParticipants: 0,
        participated: 0,
        winners: 0
      }
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

  // 参与抽奖 - POST /api/lottery-basic?action=join
  if (method === 'POST' && action === 'join') {
    const clientId = req.headers['user-agent'] + req.headers['x-forwarded-for'] || 'anonymous';
    
    let participant = participants[clientId];
    if (!participant) {
      // 生成3位数PID，确保唯一性
      let pid;
      do {
        pid = Math.floor(Math.random() * 900) + 100; // 100-999
      } while (Object.values(participants).some(p => p.pid === pid));
      
      participant = {
        pid: pid,
        participated: false,
        win: false,
        joinTime: new Date().toISOString()
      };
      participants[clientId] = participant;
      console.log('新参与者创建:', { clientId: clientId.slice(0, 20) + '...', pid: participant.pid });
    } else {
      console.log('现有参与者:', { pid: participant.pid, participated: participant.participated });
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
      console.log('活动未开放，拒绝抽奖');
      return res.status(403).json({ error: 'ACTIVITY_NOT_OPEN', state: currentState });
    }

    const clientId = req.headers['user-agent'] + req.headers['x-forwarded-for'] || 'anonymous';
    let participant = participants[clientId];
    
    // 检查是否已经参与
    if (participant && participant.participated) {
      return res.status(409).json({ error: 'ALREADY_PARTICIPATED' });
    }
    
    const pick = req.body?.pick || 0;
    const win = Math.random() < (currentConfig.hongzhongPercent / 100);
    
    // 更新参与状态
    if (!participant) {
      participant = {
        pid: Math.floor(Math.random() * 10000),
        participated: true,
        win: win,
        joinTime: new Date().toISOString()
      };
      participants[clientId] = participant;
    } else {
      participant.participated = true;
      participant.win = win;
    }
    
    return res.json({
      ok: true,
      pid: participant.pid,
      win,
      isWinner: win,
      label: win ? '红中' : '白板',
      deck: win ? ['baiban', 'baiban', 'hongzhong'] : ['hongzhong', 'baiban', 'baiban'],
      winIndex: win ? pick : (pick === 0 ? 1 : 0)
    });
  }

  // 发牌 - POST /api/lottery-basic?action=deal
  if (method === 'POST' && action === 'deal') {
    if (currentState !== 'open') {
      return res.status(403).json({ error: 'ACTIVITY_NOT_OPEN' });
    }
    
    return res.json({
      ok: true,
      cards: ['back', 'back', 'back'],
      message: '准备抽取'
    });
  }

  // 选择 - POST /api/lottery-basic?action=pick
  if (method === 'POST' && action === 'pick') {
    if (currentState !== 'open') {
      return res.status(403).json({ error: 'ACTIVITY_NOT_OPEN' });
    }

    const win = Math.random() < (currentConfig.hongzhongPercent / 100);
    return res.json({
      ok: true,
      win,
      result: win ? 'hongzhong' : 'baiban'
    });
  }

  // 排列 - GET /api/lottery-basic?action=arrangement  
  if (method === 'GET' && action === 'arrangement') {
    return res.json({
      ok: true,
      arrangement: ['back', 'back', 'back']
    });
  }

  // 获取参与者列表 - GET /api/lottery-basic?action=participants
  if (method === 'GET' && action === 'participants') {
    const participantList = Object.values(participants).map(p => ({
      pid: p.pid,
      participated: p.participated,
      win: p.win,
      joinTime: p.joinTime,
      status: p.win ? '已中奖' : p.participated ? '已参与' : '未参与'
    }));
    
    return res.json({
      total: participantList.length,
      items: participantList,
      stats: {
        total: participantList.length,
        participated: participantList.filter(p => p.participated).length,
        winners: participantList.filter(p => p.win).length,
        pending: participantList.filter(p => !p.participated).length
      }
    });
  }

  // 重置参与者 - POST /api/lottery-basic?action=reset
  if (method === 'POST' && action === 'reset') {
    const { pid } = req.body || {};
    if (pid) {
      // 重置特定参与者
      const participant = Object.values(participants).find(p => p.pid === pid);
      if (participant) {
        participant.participated = false;
        participant.win = false;
      }
    } else {
      // 重置所有参与者
      participants = {};
    }
    return res.json({ ok: true });
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

  return res.status(404).json({ error: 'Not found' });
}
