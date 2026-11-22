import { NextResponse } from 'next/server';
import { guard, jsonError } from '@/lib/session';
import { getUsers, removeUser, upsertUser } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await guard('admin');
  if (denied) return denied;
  const users = await getUsers();
  return NextResponse.json({
    users: users.map((u) => ({ username: u.username, createdAt: u.createdAt })),
    envStaffLogin: Boolean(process.env.STAFF_PASSWORD) && !users.some((u) => u.username === 'staff'),
  });
}

/** Add a user or change a user's password. */
export async function POST(req: Request) {
  const denied = await guard('admin');
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { username?: string; password?: string };
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!/^[a-z0-9._-]{2,32}$/.test(username)) return jsonError('Username: 2-32 characters, letters, numbers, . _ - only.');
  if (username === 'admin') return jsonError('"admin" is reserved. The admin password is set in Netlify environment variables.');
  if (password.length < 8) return jsonError('Password must be at least 8 characters.');
  await upsertUser(username, password);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const denied = await guard('admin');
  if (denied) return denied;
  const username = new URL(req.url).searchParams.get('username')?.toLowerCase() || '';
  if (!username) return jsonError('Missing username.');
  await removeUser(username);
  return NextResponse.json({ ok: true });
}
