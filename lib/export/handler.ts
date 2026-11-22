// Shared request handler used by the Netlify Function (production) and the dev-only Next.js route.
import { SESSION_COOKIE, readCookie, verifySession } from '../auth';
import { renderExport } from './renderer';
import { FORMATS } from './formats';
import type { ExportFormat, FlyerRenderInput } from '../types';

function json(status: number, error: string) {
  return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function handleExport(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json(405, 'Use POST.');
  const token = readCookie(req.headers.get('cookie'), SESSION_COOKIE);
  const session = await verifySession(token);
  if (!session || !token) return json(401, 'Please log in.');

  let body: { format?: ExportFormat; input?: FlyerRenderInput };
  try {
    body = await req.json();
  } catch {
    return json(400, 'Invalid export request.');
  }
  if (!body.format || !FORMATS[body.format]) return json(400, 'Unknown export format.');
  if (!body.input?.flyer) return json(400, 'Missing flyer data.');

  const origin = process.env.EXPORT_ORIGIN || new URL(req.url).origin;
  try {
    const out = await renderExport({ origin, sessionToken: token, format: body.format, input: body.input });
    return new Response(out.body as BodyInit, { status: 200, headers: { 'Content-Type': out.contentType, 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[export] failed', e);
    return json(500, `Export failed: ${(e as Error).message}`);
  }
}
