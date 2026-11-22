import { NextResponse } from 'next/server';
import { guard, jsonError } from '@/lib/session';
import { lookupProduct } from '@/lib/lookup';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { itemNumber?: string; itemType?: string };
  const itemNumber = String(body.itemNumber || '').trim();
  if (!itemNumber || itemNumber.length > 40) return jsonError('Enter an item number.');
  const itemType = body.itemType === 'BDL' ? 'BDL' : 'AGLC';
  return NextResponse.json(await lookupProduct({ itemNumber, itemType }));
}
