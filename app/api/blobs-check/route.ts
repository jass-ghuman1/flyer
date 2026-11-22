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
  for (const [label, f] of [['patched', fetch], ['orig', (fetch as unknown as { _nextOriginalFetch?: typeof fetch })._nextOriginalFetch]] as const) {
    if (!f) { out[label] = 'n/a'; continue; }
    const t = Date.now();
    try {
      const r = await Promise.race([f('https://edge.netlifyblobs.com/', { cache: 'no-store' }), new Promise<Response>((_, rej) => setTimeout(() => rej(new Error('timeout 5s')), 5000))]);
      out[label] = { ms: Date.now() - t, status: r.status };
    } catch (e) { out[label] = { ms: Date.now() - t, error: String(e) }; }
  }
  const t2 = Date.now();
  try {
    const r = await Promise.race([fetch('https://api.netlify.com/api/v1/', { cache: 'no-store' }), new Promise<Response>((_, rej) => setTimeout(() => rej(new Error('timeout 5s')), 5000))]);
    out.api = { ms: Date.now() - t2, status: r.status };
  } catch (e) { out.api = { ms: Date.now() - t2, error: String(e) }; }
  return Response.json(out);
}
