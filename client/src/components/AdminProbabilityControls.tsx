import React, { useEffect, useState } from "react";
import { apiFetch } from "../utils/request";

type Mode = 0 | 1 | 2 | 3;
const toPercent = (m: Mode) => [0, 1/3, 2/3, 1][m];

export default function AdminProbabilityControls({ activityId }: { activityId?: string }) {
  const [mode, setMode] = useState<Mode>(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const qs = activityId ? `?activityId=${encodeURIComponent(activityId)}` : "";
        const res = await apiFetch(`/api/admin-basic?action=config`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.redCountMode !== undefined) {
          const m = Math.min(3, Math.max(0, Number(data.redCountMode))) as Mode;
          setMode(m);
        } else if (typeof data?.hongzhongPercent === 'number') {
          const p = data.hongzhongPercent / 100;
          const guess: Mode = p <= 0.01 ? 0 : p < 0.5 ? 1 : p < 0.99 ? 2 : 3;
          setMode(guess);
        }
      } catch {}
    })();
  }, [activityId]);

  async function onSelect(next: Mode) {
    try {
      setSaving(true);
      const body = JSON.stringify({ 
        redCountMode: next, 
        hongzhongPercent: toPercent(next) * 100 
      });
      const res = await apiFetch('/api/admin-basic?action=config', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        credentials: 'include',
        body 
      });
      if (!res.ok) throw new Error('save failed');
      setMode(next);
    } catch (e) {
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="prob-segment glass">
      <label className="prob-title">中奖配置</label>
      <div className="prob-group" role="group" aria-label="probability segmented">
        {[{key:0,label:'全白'},{key:1,label:'一红'},{key:2,label:'两红'},{key:3,label:'全红'}].map(btn => (
          <button
            key={btn.key}
            className={`prob-btn ${mode===btn.key ? 'active' : ''}`}
            disabled={saving}
            onClick={() => onSelect(btn.key as Mode)}
          >
            {btn.label}
          </button>
        ))}
      </div>
      <p className="prob-hint">选中即生效：0%、33%、66%、100%（移动端自适配）。</p>
    </div>
  );
}


