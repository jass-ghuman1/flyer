import { NextResponse } from 'next/server';
import { guard, jsonError } from '@/lib/session';
import { duplicateFlyer } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const f = await duplicateFlyer((await ctx.params).id);
  return f ? NextResponse.json(f) : jsonError('Flyer not found.', 404);
}
