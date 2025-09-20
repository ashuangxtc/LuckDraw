import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./request";

type ActivityStatus = 'start'|'pause'|'end'|'none';

export function useActivityStatus(){
  const [status,setStatus] = useState<ActivityStatus>('none');
  const [already,setAlready] = useState(false);

  const map = (server?:string):ActivityStatus => {
    const s = (server || '').toLowerCase();
    if (s === 'open' || s === 'started' || s === 'start') return 'start';
    if (s === 'waiting' || s === 'pause' || s === 'paused') return 'pause';
    if (s === 'closed' || s === 'end' || s === 'ended') return 'end';
    return 'none';
  };

  const fetchStatus = useCallback(async()=>{
    try{
      const data = await apiFetch('/api/lottery-basic?action=status').then(r=>r.json());
      console.log('状态查询结果:', data);
      const newStatus = map(data?.state||data?.status);
      console.log('映射后状态:', newStatus);
      setStatus(newStatus);
    }catch(e){ 
      console.error('状态查询失败:', e);
      setStatus('none'); 
    }
  },[]);

  // 轮询当前设备是否已参与（管理员重置后可自动解锁）
  const fetchEligibility = useCallback(async()=>{
    try{
      // 获取本地保存的PID
      let savedPid = null;
      try { 
        const pidStr = localStorage.getItem('user_pid');
        if (pidStr && pidStr !== 'null' && pidStr !== 'undefined') {
          const parsed = parseInt(pidStr);
          if (!isNaN(parsed) && parsed >= 100 && parsed <= 999) {
            savedPid = parsed;
          }
        }
      } catch {}
      
      const r = await apiFetch('/api/lottery-basic?action=join', { 
        method:'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ clientPid: savedPid })
      });
      if (r.ok) {
        const j = await r.json();
        // participated === true 则已参与；false 则可再次抽
        const wasParticipated = !!j?.participated;
        setAlready(wasParticipated);
        
        // 保存PID和clientId
        if (j?.pid) {
          try { localStorage.setItem('user_pid', j.pid.toString()); } catch {}
        }
        if (j?.clientId) {
          try { localStorage.setItem('user_client_id', j.clientId); } catch {}
        }
        
        // 如果服务端显示未参与，清除本地中奖状态
        if (!wasParticipated) {
          try { 
            localStorage.removeItem('dm_won'); 
            // 通知其他组件重置中奖状态
            window.dispatchEvent(new CustomEvent('resetWinState'));
          } catch {}
        }
        
        // 如果之前有PID但现在服务端没有对应的参与者，说明可能被重置了
        if (savedPid && !j?.pid) {
          try {
            localStorage.removeItem('user_pid');
            console.log('Detected reset - cleared local PID');
          } catch {}
        }
      }
    }catch{/* noop */}
  },[]);

  useEffect(()=>{
    fetchStatus();
    fetchEligibility();
    // 将状态轮询间隔增加到5秒，减少API调用
    const statusInterval = setInterval(fetchStatus, 5000);
    // eligibility检查间隔更长，避免频繁的join API调用
    const eligibilityInterval = setInterval(fetchEligibility, 10000);
    
    const onVis = () => { 
      if (document.visibilityState === 'visible') { 
        fetchStatus(); 
        // 页面重新激活时才检查eligibility
        fetchEligibility();
      } 
    };
    document.addEventListener('visibilitychange', onVis);
    return ()=>{ 
      clearInterval(statusInterval); 
      clearInterval(eligibilityInterval);
      document.removeEventListener('visibilitychange', onVis); 
    };
  },[fetchStatus, fetchEligibility]);

  return { status, canDraw: status==='start' && !already, refresh: fetchStatus, markAlready:()=>setAlready(true), resetAlready:()=>setAlready(false) };
}


