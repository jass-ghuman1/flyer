// TEMPORARY diagnostic: times one Netlify Blobs read from a plain Netlify Function. Returns no data.
import { getStore } from '@netlify/blobs';

export default async () => {
  const out: Record<string, unknown> = { node: process.version, hasCtx: Boolean(process.env.NETLIFY_BLOBS_CONTEXT), hasGlobalCtx: Boolean((globalThis as { netlifyBlobsContext?: unknown }).netlifyBlobsContext) };
  const s = Date.now();
  try {
    const store = getStore({ name: 'flyer-builder-settings' });
    const v = await Promise.race([store.get('users', { type: 'json' }), new Promise((_, r) => setTimeout(() => r(new Error('timeout 8s')), 8000))]);
    out.get = { ms: Date.now() - s, found: v != null };
  } catch (e) {
    out.get = { ms: Date.now() - s, error: String(e) };
  }
  return Response.json(out);
};
