import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, constantTimeEqual, signSession, verifyPassword } from '@/lib/auth';
import { getUsers } from '@/lib/data';

export const dynamic = 'force-dynamic';

async function check(username: string, password: string): Promise<'staff' | 'admin' | null> {
  const adminPw = process.env.ADMIN_PASSWORD || '';
  if (username === 'admin') {
    return adminPw && constantTimeEqual(password, adminPw) ? 'admin' : null;
  }
  const users = await getUsers();
  const stored = users.find((u) => u.username === username);
  if (stored) return (await verifyPassword(password, stored)) ? 'staff' : null;
  // Shared staff login from the environment, unless an admin has set a password for "staff" in Settings.
  const staffPw = process.env.STAFF_PASSWORD || '';
  if (username === 'staff' && staffPw && constantTimeEqual(password, staffPw)) return 'staff';
  return null;
}

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const username = String(body.username || 'staff').trim().toLowerCase();
  const password = String(body.password || '');
  const role = password ? await check(username, password) : null;
  if (!role) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return NextResponse.json({ error: 'Wrong username or password.' }, { status: 401 });
  }
  const token = await signSession({ u: username, r: role });
  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
