// Session tokens and password hashing using Web Crypto, so the same code runs in
// Next.js middleware (edge), route handlers (node) and Netlify Functions.
import type { SessionInfo } from './types';

export const SESSION_COOKIE = 'fb_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function getSessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === 'development') return 'dev-only-session-secret-change-me';
  throw new Error('SESSION_SECRET environment variable is missing or shorter than 16 characters.');
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signSession(info: Omit<SessionInfo, 'exp'>, ttl = SESSION_TTL_SECONDS): Promise<string> {
  const payload: SessionInfo = { ...info, exp: Math.floor(Date.now() / 1000) + ttl };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const key = await hmacKey(getSessionSecret());
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionInfo | null> {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    const key = await hmacKey(getSessionSecret());
    const ok = await crypto.subtle.verify('HMAC', key, fromB64url(sig) as BufferSource, enc.encode(body));
    if (!ok) return null;
    const info = JSON.parse(new TextDecoder().decode(fromB64url(body))) as SessionInfo;
    if (!info.exp || info.exp < Math.floor(Date.now() / 1000)) return null;
    if (info.r !== 'staff' && info.r !== 'admin') return null;
    return info;
  } catch {
    return null;
  }
}

export function readCookie(header: string | null | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

export interface PasswordHash {
  salt: string;
  hash: string;
  iterations: number;
}

export async function hashPassword(password: string, saltB64?: string, iterations = 210000): Promise<PasswordHash> {
  const salt = saltB64 ? fromB64url(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    keyMat,
    256,
  );
  return { salt: b64url(salt), hash: b64url(new Uint8Array(bits)), iterations };
}

export function constantTimeEqual(a: string, b: string): boolean {
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ab.length ^ bb.length;
  const n = Math.max(ab.length, bb.length);
  for (let i = 0; i < n; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const h = await hashPassword(password, stored.salt, stored.iterations);
  return constantTimeEqual(h.hash, stored.hash);
}
