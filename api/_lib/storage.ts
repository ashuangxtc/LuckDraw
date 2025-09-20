import { kv } from '@vercel/kv';

export type Participant = {
  pid: number
  clientId?: string
  participated: boolean
  win?: boolean
  joinedAt: number
  drawAt?: number
}

export type ActivityState = 'waiting' | 'open' | 'closed';

export type ActivityConfig = {
  redCountMode: number // 0|1|2|3
}

export class VercelStorage {
  private readonly PARTICIPANT_PREFIX = 'participant:';
  private readonly CLIENT_ID_PREFIX = 'clientId:';
  private readonly ACTIVITY_STATE_KEY = 'activity:state';
  private readonly ACTIVITY_CONFIG_KEY = 'activity:config';
  private readonly NEXT_PID_KEY = 'next:pid';
  private readonly ADMIN_SESSION_PREFIX = 'admin:session:';
  private readonly ROUND_PREFIX = 'round:';

  async getParticipant(pid: number): Promise<Participant | null> {
    try {
      const data = await kv.get(`${this.PARTICIPANT_PREFIX}${pid}`);
      return data as Participant | null;
    } catch {
      return null;
    }
  }

  async setParticipant(participant: Participant): Promise<void> {
    await kv.set(`${this.PARTICIPANT_PREFIX}${participant.pid}`, participant);
    if (participant.clientId) {
      await kv.set(`${this.CLIENT_ID_PREFIX}${participant.clientId}`, participant.pid);
    }
  }

  async getParticipantByClientId(clientId: string): Promise<Participant | null> {
    try {
      const pid = await kv.get(`${this.CLIENT_ID_PREFIX}${clientId}`) as number;
      if (pid) {
        return await this.getParticipant(pid);
      }
      return null;
    } catch {
      return null;
    }
  }

  async getAllParticipants(): Promise<Participant[]> {
    try {
      const keys = await kv.keys(`${this.PARTICIPANT_PREFIX}*`);
      const participants: Participant[] = [];
      
      for (const key of keys) {
        const participant = await kv.get(key) as Participant;
        if (participant) {
          participants.push(participant);
        }
      }
      
      return participants.sort((a, b) => a.pid - b.pid);
    } catch {
      return [];
    }
  }

  async getNextPid(): Promise<number> {
    try {
      const nextPid = await kv.get(this.NEXT_PID_KEY) as number || 0;
      await kv.set(this.NEXT_PID_KEY, (nextPid + 1) % 1001);
      return nextPid;
    } catch {
      return 0;
    }
  }

  async getActivityState(): Promise<ActivityState> {
    try {
      const state = await kv.get(this.ACTIVITY_STATE_KEY) as ActivityState;
      return state || 'waiting';
    } catch {
      return 'waiting';
    }
  }

  async setActivityState(state: ActivityState): Promise<void> {
    await kv.set(this.ACTIVITY_STATE_KEY, state);
  }

  async getActivityConfig(): Promise<ActivityConfig> {
    try {
      const config = await kv.get(this.ACTIVITY_CONFIG_KEY) as ActivityConfig;
      return config || { redCountMode: 1 };
    } catch {
      return { redCountMode: 1 };
    }
  }

  async setActivityConfig(config: ActivityConfig): Promise<void> {
    await kv.set(this.ACTIVITY_CONFIG_KEY, config);
  }

  async setAdminSession(token: string, expiresAt: number): Promise<void> {
    await kv.set(`${this.ADMIN_SESSION_PREFIX}${token}`, expiresAt, { ex: Math.floor((expiresAt - Date.now()) / 1000) });
  }

  async getAdminSession(token: string): Promise<number | null> {
    try {
      const expiresAt = await kv.get(`${this.ADMIN_SESSION_PREFIX}${token}`) as number;
      return expiresAt || null;
    } catch {
      return null;
    }
  }

  async deleteAdminSession(token: string): Promise<void> {
    await kv.del(`${this.ADMIN_SESSION_PREFIX}${token}`);
  }

  async setRound(roundId: string, data: { faces: ('zhong'|'blank')[], createdAt: number }): Promise<void> {
    await kv.set(`${this.ROUND_PREFIX}${roundId}`, data, { ex: 3600 }); // 1小时过期
  }

  async getRound(roundId: string): Promise<{ faces: ('zhong'|'blank')[], createdAt: number } | null> {
    try {
      const data = await kv.get(`${this.ROUND_PREFIX}${roundId}`);
      return data as { faces: ('zhong'|'blank')[], createdAt: number } | null;
    } catch {
      return null;
    }
  }

  async deleteRound(roundId: string): Promise<void> {
    await kv.del(`${this.ROUND_PREFIX}${roundId}`);
  }

  async resetAll(): Promise<void> {
    // 获取所有相关的键
    const participantKeys = await kv.keys(`${this.PARTICIPANT_PREFIX}*`);
    const clientIdKeys = await kv.keys(`${this.CLIENT_ID_PREFIX}*`);
    const roundKeys = await kv.keys(`${this.ROUND_PREFIX}*`);
    
    // 删除所有相关数据
    const allKeys = [...participantKeys, ...clientIdKeys, ...roundKeys];
    if (allKeys.length > 0) {
      await kv.del(...allKeys);
    }
    
    // 重置 pid 计数器
    await kv.set(this.NEXT_PID_KEY, 0);
  }
}

export const storage = new VercelStorage();
