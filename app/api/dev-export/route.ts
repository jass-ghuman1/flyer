// Local development only. In production the Netlify Function at /.netlify/functions/export is used.
import { handleExport } from '@/lib/export/handler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_EXPORT !== '1') {
    return new Response('Not found', { status: 404 });
  }
  return handleExport(req);
}
