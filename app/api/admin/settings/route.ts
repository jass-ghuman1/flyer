import { NextResponse } from 'next/server';
import { guard, jsonError } from '@/lib/session';
import { saveSettings } from '@/lib/data';
import type { AppSettings } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  const denied = await guard('admin');
  if (denied) return denied;
  let body: AppSettings;
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid settings data.');
  }
  if (!Array.isArray(body.stores) || body.stores.some((s) => !s.id || !String(s.displayName || '').trim())) {
    return jsonError('Every store needs a display name.');
  }
  return NextResponse.json(await saveSettings(body));
}
