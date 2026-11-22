import { NextResponse } from 'next/server';
import { guard } from '@/lib/session';
import { searchProducts } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const q = new URL(req.url).searchParams.get('q') || '';
  return NextResponse.json(await searchProducts(q));
}
