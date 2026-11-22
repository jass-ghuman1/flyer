import { NextResponse } from 'next/server';
import { guard } from '@/lib/session';
import { getSettings } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json(await getSettings());
}
