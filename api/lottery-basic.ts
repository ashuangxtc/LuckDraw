import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

// KV存储键名
const ACTIVITY_STATE_KEY = 'activity:state';
const ACTIVITY_CONFIG_KEY = 'activity:config'; 
const PARTICIPANTS_KEY = 'activity:participants';

// 内存缓存（用于性能，但会与KV同步）
let currentState: 'waiting' | 'open' | 'closed' = 'waiting';
let currentConfig = {
  hongzhongPercent: 33,
  redCountMode: 1
};
let participants: Record<string, {
  pid: number;
  participated: boolean;
  win: boolean;
  joinTime: string;
}> = {};

// 从KV加载数据到内存（每次都加载最新数据）
async function loadFromKV() {
  try {
    console.log('Loading fresh data from KV...');
    
    // 加载状态
    const savedState = await kv.get(ACTIVITY_STATE_KEY);
    if (savedState) {
      currentState = savedState as 'waiting' | 'open' | 'closed';
      console.log('Loaded state from KV:', currentState);
    } else {
      console.log('No saved state in KV, using default:', currentState);
    }
    
    // 加载配置
    const savedConfig = await kv.get(ACTIVITY_CONFIG_KEY);
    if (savedConfig) {
      currentConfig = savedConfig as any;
      console.log('Loaded config from KV:', currentConfig);
    } else {
      console.log('No saved config in KV, using default:', currentConfig);
    }
    
    // 加载参与者
    const savedParticipants = await kv.get(PARTICIPANTS_KEY);
    if (savedParticipants) {
      participants = savedParticipants as any;
      console.log('Loaded participants from KV:', Object.keys(participants).length, 'participants');
    } else {
      participants = {}; // 确保重置为空对象
      console.log('No saved participants in KV, using empty object');
    }
  } catch (error) {
    console.error('Failed to load from KV:', error);
    // 保持默认值，但不影响功能
  }
}

// 保存状态到KV
async function saveStateToKV() {
  try {
    await kv.set(ACTIVITY_STATE_KEY, currentState);
    console.log('Saved state to KV:', currentState);
  } catch (error) {
    console.error('Failed to save state to KV:', error);
  }
}

// 保存配置到KV
async function saveConfigToKV() {
  try {
    await kv.set(ACTIVITY_CONFIG_KEY, currentConfig);
    console.log('Saved config to KV:', currentConfig);
  } catch (error) {
    console.error('Failed to save config to KV:', error);
  }
}

// 保存参与者到KV
async function saveParticipantsToKV() {
  try {
    await kv.set(PARTICIPANTS_KEY, participants);
    console.log('Saved participants to KV:', Object.keys(participants).length, 'participants');
    console.log('Participants data:', JSON.stringify(participants, null, 2).substring(0, 500));
  } catch (error) {
    console.error('Failed to save participants to KV:', error);
  }
}

// 清除所有KV数据
async function clearAllKVData() {
  try {
    console.log('Clearing all KV data...');
    await kv.del(ACTIVITY_STATE_KEY);
    await kv.del(ACTIVITY_CONFIG_KEY);
    await kv.del(PARTICIPANTS_KEY);
    console.log('Successfully cleared all KV data');
  } catch (error) {
    console.error('Failed to clear KV data:', error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 确保数据已从KV加载
  await loadFromKV();
  const { method, query } = req;
  const action = query.action as string;

  // 强制清理KV数据 - POST /api/lottery-basic?action=force-clear-kv
  if (method === 'POST' && action === 'force-clear-kv') {
    try {
      console.log('Force clearing all KV data...');
      
      // 强制删除所有相关的KV键
      const keysToDelete = [
        ACTIVITY_STATE_KEY,
        ACTIVITY_CONFIG_KEY,
        PARTICIPANTS_KEY,
        // 可能的其他键
        'activity:participants',
        'participants',
        'state',
        'config',
        'lottery:state',
        'lottery:config',
        'lottery:participants',
        // VercelStorage系统的键
        'activity_state',
        'activity_config',
        'next_pid'
      ];
      
      // 还需要清除所有participant:*和client_id:*键
      try {
        const participantKeys = await kv.keys('participant:*');
        const clientIdKeys = await kv.keys('client_id:*');
        const allKeys = [...keysToDelete, ...participantKeys, ...clientIdKeys];
        
        console.log('Found keys to delete:', allKeys.length);
        
        for (const key of allKeys) {
          try {
            await kv.del(key);
            console.log(`Deleted KV key: ${key}`);
          } catch (error) {
            console.log(`Failed to delete KV key ${key}:`, error);
          }
        }
      } catch (error) {
        // 如果keys()不支持，回退到删除已知键
        for (const key of keysToDelete) {
          try {
            await kv.del(key);
            console.log(`Deleted KV key: ${key}`);
          } catch (error) {
            console.log(`Failed to delete KV key ${key}:`, error);
          }
        }
      }
      
      // 清空内存数据
      Object.keys(participants).forEach(key => delete participants[key]);
      currentState = 'waiting';
      currentConfig = { hongzhongPercent: 33, redCountMode: 1 };
      
      // 等待一下
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 验证清理结果
      const remainingKeys: Array<{ key: string; value: any }> = [];
      
      // 检查基本键
      const basicKeys = [ACTIVITY_STATE_KEY, ACTIVITY_CONFIG_KEY, PARTICIPANTS_KEY, 'activity_state', 'activity_config', 'next_pid'];
      for (const key of basicKeys) {
        try {
          const value = await kv.get(key);
          if (value !== null) {
            remainingKeys.push({ key, value });
          }
        } catch {}
      }
      
      // 检查participant和client_id键
      try {
        const participantKeys = await kv.keys('participant:*');
        const clientIdKeys = await kv.keys('client_id:*');
        for (const key of [...participantKeys, ...clientIdKeys]) {
          try {
            const value = await kv.get(key);
            if (value !== null) {
              remainingKeys.push({ key, value: 'exists' });
            }
          } catch {}
        }
      } catch {}
      
      console.log('Force clear completed. Remaining keys:', remainingKeys);
      
      return res.json({
        ok: true,
        message: 'Force clear completed',
        clearedKeys: keysToDelete,
        remainingKeys: remainingKeys,
        memoryState: {
          participantCount: Object.keys(participants).length,
          state: currentState,
          config: currentConfig
        }
      });
    } catch (error) {
      return res.json({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // 调试KV数据 - GET /api/lottery-basic?action=debug-kv
  if (method === 'GET' && action === 'debug-kv') {
    try {
      const kvState = await kv.get(ACTIVITY_STATE_KEY);
      const kvConfig = await kv.get(ACTIVITY_CONFIG_KEY);
      const kvParticipants = await kv.get(PARTICIPANTS_KEY);
      
      return res.json({
        ok: true,
        debug: {
          memory: {
            state: currentState,
            config: currentConfig,
            participantCount: Object.keys(participants).length,
            participants: Object.keys(participants).map(key => ({ 
              key: key.substring(0, 50), 
              pid: participants[key].pid,
              participated: participants[key].participated,
              win: participants[key].win
            }))
          },
          kv: {
            state: kvState,
            config: kvConfig,
            participantCount: kvParticipants ? Object.keys(kvParticipants).length : 0,
            participants: kvParticipants ? Object.keys(kvParticipants as any).map(key => ({ 
              key: key.substring(0, 50), 
              pid: (kvParticipants as any)[key].pid,
              participated: (kvParticipants as any)[key].participated,
              win: (kvParticipants as any)[key].win
            })) : []
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      return res.json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  }

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

  // 设置配置 - POST /api/lottery-basic?action=config
  if (method === 'POST' && action === 'config') {
    // 检查管理员认证
    const cookies = req.headers.cookie || '';
    const isLoggedIn = cookies.includes('admin_logged_in=true');
    
    if (!isLoggedIn) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }
    
    const { hongzhongPercent, redCountMode } = req.body || {};
    
    if (typeof hongzhongPercent === 'number') {
      currentConfig.hongzhongPercent = Math.min(100, Math.max(0, hongzhongPercent));
    }
    
    if (typeof redCountMode === 'number') {
      currentConfig.redCountMode = Math.min(3, Math.max(0, redCountMode));
    }
    
    // 同步配置到KV
    await saveConfigToKV();
    
    console.log('Config updated:', currentConfig);
    
    return res.json({
      ok: true,
      config: currentConfig,
      timestamp: new Date().toISOString()
    });
  }

  // 管理员登录 - POST /api/lottery-basic?action=login
  if (method === 'POST' && action === 'login') {
    try {
      const { password } = req.body || {};
      console.log('Admin login attempt received');
      
      const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';
      
      if (password === expectedPassword) {
        res.setHeader('Set-Cookie', 'admin_logged_in=true; HttpOnly; Path=/; Max-Age=3600');
        console.log('Admin login successful');
        return res.json({ ok: true, message: 'Login successful' });
      } else {
        console.log('Admin login failed - wrong password');
        return res.status(401).json({ ok: false, error: 'Invalid password' });
      }
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ ok: false, error: 'Login failed' });
    }
  }

  // 管理员登出 - POST /api/lottery-basic?action=logout
  if (method === 'POST' && action === 'logout') {
    res.setHeader('Set-Cookie', 'admin_logged_in=; HttpOnly; Path=/; Max-Age=0');
    return res.json({ ok: true, message: 'Logout successful' });
  }

  // 检查管理员状态 - GET /api/lottery-basic?action=me
  if (method === 'GET' && action === 'me') {
    const cookies = req.headers.cookie || '';
    const isLoggedIn = cookies.includes('admin_logged_in=true');
    return res.json({ loggedIn: isLoggedIn });
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
    // 检查管理员认证
    const cookies = req.headers.cookie || '';
    const isLoggedIn = cookies.includes('admin_logged_in=true');
    
    if (!isLoggedIn) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }
    
    const { state } = req.body || {};
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || '';
    const forwardedFor = req.headers['x-forwarded-for'] || '';
    
    console.log('Set-state request received:', { 
      state, 
      currentState, 
      userAgent: userAgent.substring(0, 100),
      referer,
      forwardedFor,
      timestamp: new Date().toISOString()
    });
    
    if (state && ['waiting', 'open', 'closed'].includes(state)) {
      const oldState = currentState;
      currentState = state;
      
      // 同步到KV存储
      await saveStateToKV();
      
      console.log('Lottery state changed:', { 
        from: oldState, 
        to: state, 
        userAgent: userAgent.substring(0, 100),
        referer,
        timestamp: new Date().toISOString() 
      });
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
      let pid: number;
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
    
    // 同步参与者数据到KV
    await saveParticipantsToKV();
    
    return res.json({
      pid: participant.pid,
      participated: participant.participated,
      win: participant.win,
      clientId: clientId // 返回clientId供前端保存使用
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

    // 同步参与者数据到KV
    await saveParticipantsToKV();

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
    // 兼容两种参数格式
    const { clientId, pid, cardIndex, roundId, index } = req.body || {};
    
    if (currentState !== 'open') {
      return res.status(400).json({ 
        ok: false, 
        error: 'Activity not open' 
      });
    }

    // 支持新格式(clientId, pid, cardIndex)和旧格式(roundId, index)
    const finalCardIndex = typeof cardIndex === 'number' ? cardIndex : index;
    
    if (typeof finalCardIndex !== 'number') {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing cardIndex or index parameter' 
      });
    }

    let participant: { pid: number; participated: boolean; win: boolean; joinTime: string } | null = null;
    
    // 如果有clientId，尝试使用精确匹配
    if (clientId) {
      participant = participants[clientId];
      
      if (!participant && pid) {
        const allParticipants = Object.values(participants);
        const foundByPid = allParticipants.find(p => p.pid === pid);
        if (foundByPid) {
          participant = foundByPid;
          participants[clientId] = participant;
        }
      }
    } else {
      // 如果没有clientId，使用第一个已参与的参与者（兼容旧逻辑）
      const allParticipants = Object.values(participants);
      participant = allParticipants.find(p => p.participated) || null;
    }

    if (!participant) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Participant not found. Please join the activity first.' 
      });
    }

    if (!participant.participated) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Participant has not drawn yet. Please draw first.' 
      });
    }

    // 这里应该根据实际的牌组数据来判断是否中奖
    // 暂时使用随机逻辑作为示例
    const isWin = Math.random() < (currentConfig.hongzhongPercent / 100);
    
    participant.win = isWin;
    participants[clientId] = participant;

    // 同步参与者数据到KV
    await saveParticipantsToKV();

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
    // 检查管理员认证
    const cookies = req.headers.cookie || '';
    const isLoggedIn = cookies.includes('admin_logged_in=true');
    
    if (!isLoggedIn) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }
    
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
      // 同步参与者数据到KV
      await saveParticipantsToKV();
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
      // 同步状态到KV
      await saveStateToKV();
      console.log('Lottery state synced to:', currentState);
    }
    
    if (config) {
      if (typeof config.hongzhongPercent === 'number') {
        currentConfig.hongzhongPercent = config.hongzhongPercent;
      }
      if (typeof config.redCountMode === 'number') {
        currentConfig.redCountMode = config.redCountMode;
      }
      // 同步配置到KV
      await saveConfigToKV();
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
    // 检查管理员认证
    const cookies = req.headers.cookie || '';
    const isLoggedIn = cookies.includes('admin_logged_in=true');
    
    if (!isLoggedIn) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }
    
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || '';
    const forwardedFor = req.headers['x-forwarded-for'] || '';
    
    console.log('RESET-ALL triggered!', {
      currentState,
      userAgent: userAgent.substring(0, 100),
      referer,
      forwardedFor,
      timestamp: new Date().toISOString(),
      participantCount: Object.keys(participants).length
    });
    
    // 清除所有参与者数据
    Object.keys(participants).forEach(key => delete participants[key]);
    const oldState = currentState;
    currentState = 'waiting';
    currentConfig = { hongzhongPercent: 33, redCountMode: 1 };
    
    // 彻底清除KV数据，然后重新保存默认值
    await clearAllKVData();
    
    // 等待一下确保删除完成
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await saveStateToKV();
    await saveConfigToKV();
    await saveParticipantsToKV();
    
    // 验证重置结果
    const verifyState = await kv.get(ACTIVITY_STATE_KEY);
    const verifyParticipants = await kv.get(PARTICIPANTS_KEY);
    
    console.log('Lottery data reset completed:', {
      stateChange: `${oldState} → waiting`,
      timestamp: new Date().toISOString(),
      message: 'All participants cleared, state reset to waiting',
      verification: {
        kvState: verifyState,
        kvParticipantCount: verifyParticipants ? Object.keys(verifyParticipants).length : 0,
        memoryParticipantCount: Object.keys(participants).length
      }
    });
    return res.json({ 
      ok: true, 
      message: 'Lottery data reset successfully',
      verification: {
        state: verifyState,
        participantCount: verifyParticipants ? Object.keys(verifyParticipants).length : 0
      }
    });
  }

  return res.status(404).json({ error: 'Not found' });
}