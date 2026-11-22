// TEMPORARY diagnostic: same Blobs read from inside the Next.js server. Returns no data.
import { getStore } from '@netlify/blobs';
export const dynamic = 'force-dynamic';
export async function GET() {
  const g = globalThis as { netlifyBlobsContext?: string };
  let ctxInfo: unknown = null;
  try {
    const raw = g.netlifyBlobsContext || process.env.NETLIFY_BLOBS_CONTEXT;
    if (raw) { const c = JSON.parse(Buffer.from(raw, 'base64').toString()); ctxInfo = { keys: Object.keys(c), edgeURL: c.edgeURL, apiURL: c.apiURL, uncachedEdgeURL: c.uncachedEdgeURL }; }
  } catch (e) { ctxInfo = String(e); }
  const out: Record<string, unknown> = { node: process.version, envCtx: Boolean(process.env.NETLIFY_BLOBS_CONTEXT), globalCtx: Boolean(g.netlifyBlobsContext), ctxInfo };
  const s = Date.now();
  try {
    const store = getStore({ name: 'flyer-builder-settings' });
    const v = await Promise.race([store.get('users', { type: 'json' }), new Promise((_, r) => setTimeout(() => r(new Error('timeout 8s')), 8000))]);
    out.get = { ms: Date.now() - s, found: v != null };
  } catch (e) {
    out.get = { ms: Date.now() - s, error: String(e) };
  }
  return Response.json(out);
}
