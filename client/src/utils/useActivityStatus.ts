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
      const data = await apiFetch('/api/state-sync').then(r=>r.json());
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
      const r = await apiFetch('/api/lottery-basic?action=join', { method:'POST' });
      if (r.ok) {
        const j = await r.json();
        // participated === true 则已参与；false 则可再次抽
        const wasParticipated = !!j?.participated;
        setAlready(wasParticipated);
        
        // 如果服务端显示未参与，清除本地中奖状态
        if (!wasParticipated) {
          try { 
            localStorage.removeItem('dm_won'); 
            // 通知其他组件重置中奖状态
            window.dispatchEvent(new CustomEvent('resetWinState'));
          } catch {}
        }
      }
    }catch{/* noop */}
  },[]);

  useEffect(()=>{
    fetchStatus();
    fetchEligibility();
    const tick = async () => { await fetchStatus(); await fetchEligibility(); };
    const t = setInterval(tick, 1000);
    const onVis = () => { if (document.visibilityState === 'visible') { tick(); } };
    document.addEventListener('visibilitychange', onVis);
    return ()=>{ clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  },[fetchStatus, fetchEligibility]);

  return { status, canDraw: status==='start' && !already, refresh: fetchStatus, markAlready:()=>setAlready(true), resetAlready:()=>setAlready(false) };
}


