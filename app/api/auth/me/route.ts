import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
  return NextResponse.json({ username: s.u, role: s.r });
}
