import type { VercelRequest } from '@vercel/node';
import crypto from 'crypto';

export function readClientId(req: VercelRequest): string | undefined {
  const h = (req.headers['x-client-id'] || req.headers['X-Client-Id'] || '') as string;
  const q = (req.query?.cid || req.body?.cid) as string | undefined;
  const cid = (h || q || '').toString().trim();
  return cid || undefined;
}

export function generateRoundId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function sampleFacesByCount(redCount: number): ('zhong'|'blank')[] {
  const faces: ('zhong'|'blank')[] = Array(3).fill('blank');
  const indices = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, redCount);
  indices.forEach(i => faces[i] = 'zhong');
  
  console.log(`生成牌面: redCount=${redCount}, 排列=[${faces.join(',')}]`);
  return faces;
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  
  return cookieHeader
    .split(';')
    .reduce((cookies, cookie) => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = value;
      }
      return cookies;
    }, {} as Record<string, string>);
}

export function setCookie(name: string, value: string, options: { 
  httpOnly?: boolean, 
  maxAge?: number, 
  sameSite?: string,
  path?: string 
} = {}): string {
  let cookie = `${name}=${value}`;
  
  if (options.httpOnly) cookie += '; HttpOnly';
  if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  if (options.path) cookie += `; Path=${options.path}`;
  
  return cookie;
}
