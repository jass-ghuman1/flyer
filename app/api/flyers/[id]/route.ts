import { NextResponse } from 'next/server';
import { guard, jsonError } from '@/lib/session';
import { deleteFlyer, ensureSeed, getFlyer } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  await ensureSeed();
  const f = await getFlyer((await ctx.params).id);
  return f ? NextResponse.json(f) : jsonError('Flyer not found.', 404);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  await deleteFlyer((await ctx.params).id);
  return NextResponse.json({ ok: true });
}
