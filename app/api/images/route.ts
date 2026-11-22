import { NextResponse } from 'next/server';
import { guard, jsonError } from '@/lib/session';
import { MAX_IMAGE_BYTES, saveImage } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** Upload: raw image bytes in the request body (the browser resizes/compresses before sending). */
export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const len = Number(req.headers.get('content-length') || 0);
  if (len > MAX_IMAGE_BYTES) return jsonError('Image is larger than 10 MB.', 413);
  try {
    const id = await saveImage(await req.arrayBuffer());
    return NextResponse.json({ id });
  } catch (e) {
    return jsonError((e as Error).message);
  }
}
