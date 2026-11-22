import { NextResponse } from 'next/server';
import { guard, jsonError } from '@/lib/session';
import { listFlyers, saveFlyer } from '@/lib/data';
import type { Flyer } from '@/lib/types';
import { THEME_IDS } from '@/lib/themes';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json(await listFlyers());
}

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  let f: Flyer;
  try {
    f = await req.json();
  } catch {
    return jsonError('Invalid flyer data.');
  }
  if (!THEME_IDS.includes(f.themeId)) return jsonError('Pick a season or theme.');
  if (!f.storeId) return jsonError('Pick a store.');
  if (f.fromDate && f.toDate && f.toDate < f.fromDate) return jsonError('"To" date cannot be before "From" date.');
  if (!Array.isArray(f.slots)) return jsonError('Invalid item slots.');
  return NextResponse.json(await saveFlyer(f));
}
