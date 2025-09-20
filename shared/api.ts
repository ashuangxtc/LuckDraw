// shared/api.ts - 共享的API调用逻辑
import { config } from './config';

export type JoinResp = { pid: number; participated: boolean }
export type DrawResp = { pid: number; win: boolean; isWinner: boolean; label: string }
export type Participant = {
  pid: number
  participated: boolean
  win?: boolean
  joinedAt: number
  drawAt?: number
}

export async function join(base = config.apiBase): Promise<JoinResp> {
  const r = await fetch(`${base}/api/lottery/join`, { 
    method: 'POST', 
    credentials: 'include' 
  })
  if (!r.ok) throw new Error('join failed')
  return r.json()
}

export async function draw(choice: number, base = config.apiBase): Promise<DrawResp> {
  const r = await fetch(`${base}/api/lottery/draw`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ choice })
  })
  if (!r.ok) throw new Error('draw failed')
  return r.json()
}

export async function getParticipants(base = config.apiBase) {
  const r = await fetch(`${base}/api/admin/participants`, { 
    credentials: 'include' 
  })
  if (!r.ok) throw new Error('get participants failed')
  return r.json()
}

export async function resetParticipant(pid: number, base = config.apiBase) {
  const r = await fetch(`${base}/api/admin/reset/${pid}`, { 
    method: 'POST', 
    credentials: 'include' 
  })
  if (!r.ok) throw new Error('reset participant failed')
  return r.json()
}

export async function resetAll(base = config.apiBase) {
  const r = await fetch(`${base}/api/admin/reset-all`, { 
    method: 'POST', 
    credentials: 'include' 
  })
  if (!r.ok) throw new Error('reset all failed')
  return r.json()
}

export async function health(base = config.apiBase) {
  const r = await fetch(`${base}/api/health`, { credentials: 'include' })
  if (!r.ok) throw new Error('health check failed')
  return r.json()
}

export async function getGameStatus(base = config.apiBase) {
  const url = base ? `${base}/api/lottery/status` : '/api/lottery/status'
  const r = await fetch(url, { credentials: 'include' })
  if (!r.ok) throw new Error('get game status failed')
  return r.json()
}

// 新API: 发牌
export async function deal(base = config.apiBase): Promise<{ roundId: string; faces: ('zhong'|'blank')[] }> {
  const url = base ? `${base}/api/lottery/deal` : '/api/lottery/deal'
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  })
  if (!r.ok) throw new Error('deal failed')
  return r.json()
}

// 新API: 选牌
export async function pick(roundId: string, index: number, base = config.apiBase): Promise<{ win: boolean; face: 'zhong'|'blank'; faces: ('zhong'|'blank')[] }> {
  const url = base ? `${base}/api/lottery/pick` : '/api/lottery/pick'
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ roundId, index })
  })
  if (!r.ok) throw new Error('pick failed')
  return r.json()
}

// 新API: 设置概率 (0-1)
export async function setWinRate(winRate: number, base = config.apiBase): Promise<{ ok: boolean; winRate: number }> {
  const url = base ? `${base}/api/lottery/config` : '/api/lottery/config'
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ winRate })
  })
  if (!r.ok) throw new Error('set win rate failed')
  return r.json()
}

// 兼容旧API: 获取牌面排列 (现在调用 deal)
export async function getArrangement(base = config.apiBase) {
  return await deal(base);
}

export async function setGameState(state: 'waiting' | 'open' | 'closed', base = config.apiBase) {
  const url = base ? `${base}/api/admin/set-state` : '/api/admin/set-state'
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ state })
  })
  if (!r.ok) throw new Error('set game state failed')
  return r.json()
}

// 管理员登录
export async function adminLogin(password: string, base = config.apiBase) {
  const url = base ? `${base}/api/admin/login` : '/api/admin/login'
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password })
  })
  if (!r.ok) throw new Error('admin login failed')
  return r.json()
}

// 管理员登出
export async function adminLogout(base = config.apiBase) {
  const url = base ? `${base}/api/admin/logout` : '/api/admin/logout'
  const r = await fetch(url, {
    method: 'POST',
    credentials: 'include'
  })
  if (!r.ok) throw new Error('admin logout failed')
  return r.json()
}

// 获取管理员状态
export async function getAdminStatus(base = config.apiBase) {
  const url = base ? `${base}/api/admin/me` : '/api/admin/me'
  const r = await fetch(url, {
    credentials: 'include'
  })
  if (!r.ok) throw new Error('get admin status failed')
  return r.json()
}

// 设置红中张数
export async function setRedCountMode(redCountMode: number, base = config.apiBase) {
  const url = base ? `${base}/api/lottery/config` : '/api/lottery/config'
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ redCountMode })
  })
  if (!r.ok) throw new Error('set red count mode failed')
  return r.json()
}

// 获取配置
export async function getConfig(base = config.apiBase) {
  const url = base ? `${base}/api/lottery/config` : '/api/lottery/config'
  const r = await fetch(url, {
    credentials: 'include'
  })
  if (!r.ok) throw new Error('get config failed')
  return r.json()
}

