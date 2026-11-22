import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from './auth';
import type { SessionInfo } from './types';

export async function getSession(): Promise<SessionInfo | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

/** Returns a 401/403 response when the caller is not allowed, otherwise null. */
export async function guard(role: 'staff' | 'admin' = 'staff'): Promise<NextResponse | null> {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
  if (role === 'admin' && s.r !== 'admin') return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  return null;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
