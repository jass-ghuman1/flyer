import 'server-only';
import { libraryProvider } from './library';
import { liquorConnectProvider } from './liquorConnect';
import { bdlProvider } from './bdl';
import { publicSearchProvider } from './publicSearch';
import type { LookupProvider, LookupQuery, LookupResult } from './types';
import { saveImage, MAX_IMAGE_BYTES } from '../data';

/** Providers in the order they are tried. */
export const PROVIDERS: LookupProvider[] = [libraryProvider, liquorConnectProvider, bdlProvider, publicSearchProvider];

export interface LookupResponse {
  found: boolean;
  source?: string;
  product?: LookupResult;
  tried: string[];
}

export async function lookupProduct(q: LookupQuery): Promise<LookupResponse> {
  const tried: string[] = [];
  for (const p of PROVIDERS) {
    if (!p.isConfigured()) continue;
    tried.push(p.id);
    try {
      const r = await p.lookup(q);
      if (r && (r.name || r.imageId || r.imageUrl)) {
        if (!r.imageId && r.imageUrl) {
          r.imageId = (await importRemoteImage(r.imageUrl).catch(() => null)) ?? undefined;
        }
        delete r.imageUrl;
        return { found: true, source: p.label, product: r, tried };
      }
    } catch (err) {
      console.warn(`[lookup] provider ${p.id} failed:`, (err as Error).message);
    }
  }
  return { found: false, tried };
}

function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;
  return false;
}

/** Downloads a remote image into our image store (so flyers never depend on outside links). */
export async function importRemoteImage(url: string): Promise<string | null> {
  const u = new URL(url);
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (isBlockedHost(u.hostname)) return null;
  const res = await fetch(u, { signal: AbortSignal.timeout(8000), redirect: 'follow' });
  if (!res.ok) return null;
  const len = Number(res.headers.get('content-length') || 0);
  if (len > MAX_IMAGE_BYTES) return null;
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_IMAGE_BYTES) return null;
  return saveImage(buf);
}
