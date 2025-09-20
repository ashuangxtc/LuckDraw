import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage, type Participant } from '../../_lib/storage';
import { requireAdmin } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!(await requireAdmin(req, res))) {
    return;
  }

  try {
    const { pid } = req.query;
    const pidNumber = Number(pid);
    
    if (isNaN(pidNumber)) {
      return res.status(400).json({ error: 'Invalid PID' });
    }

    const existingParticipant = await storage.getParticipant(pidNumber);
    
    if (existingParticipant) {
      // 重置参与者状态
      const resetParticipant: Participant = {
        pid: pidNumber,
        clientId: existingParticipant.clientId,
        participated: false,
        joinedAt: existingParticipant.joinedAt,
        win: undefined,
        drawAt: undefined
      };
      
      await storage.setParticipant(resetParticipant);
      console.log(`管理员重置PID ${pidNumber}`);
      return res.json({ ok: true, pid: pidNumber, message: `已重置参与者 ${pidNumber}` });
    } else {
      // 不存在则创建空号位
      const newParticipant: Participant = { 
        pid: pidNumber, 
        participated: false, 
        joinedAt: Date.now() 
      };
      await storage.setParticipant(newParticipant);
      res.json({ ok: true, pid: pidNumber, message: `已创建参与者 ${pidNumber}` });
    }
  } catch (error) {
    console.error('Reset participant error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
