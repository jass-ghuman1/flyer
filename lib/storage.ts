// Storage wrapper: Netlify Blobs in production, local files under .data/ in development.
import { getStore } from '@netlify/blobs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export type StoreName = 'settings' | 'flyers' | 'products' | 'images';

export interface BinaryRecord {
  data: ArrayBuffer;
  contentType: string;
}

interface Driver {
  getJSON<T>(key: string): Promise<T | null>;
  setJSON(key: string, value: unknown): Promise<void>;
  getBinary(key: string): Promise<BinaryRecord | null>;
  setBinary(key: string, data: ArrayBuffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}

function useLocal(): boolean {
  if (process.env.FLYER_STORAGE === 'local') return true;
  if (process.env.FLYER_STORAGE === 'netlify') return false;
  return process.env.NODE_ENV === 'development';
}

/** Fails fast (with a log line) instead of letting a stuck storage call hang the request. */
async function timed<T>(label: string, p: Promise<T>, ms = 8000): Promise<T> {
  const start = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Storage timed out (${label}).`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    const took = Date.now() - start;
    if (took > 1500) console.warn(`[storage] slow ${label}: ${took} ms`);
  }
}

function netlifyDriver(name: StoreName): Driver {
  // Next.js patches global fetch inside route handlers; Blobs calls through the patched fetch hung on Netlify.
  // Use Node's original fetch, uncached.
  const rawFetch: typeof fetch = (input, init) => {
    const f = globalThis.fetch as typeof fetch & { _nextOriginalFetch?: typeof fetch };
    return (f._nextOriginalFetch ?? f)(input, { ...init, cache: 'no-store' });
  };
  const raw = getStore({ name: `flyer-builder-${name}`, fetch: rawFetch });
  const store = {
    get: ((k: string, o?: object) => timed(`get ${name}/${k}`, raw.get(k, o as never))) as typeof raw.get,
    setJSON: (k: string, v: unknown) => timed(`setJSON ${name}/${k}`, raw.setJSON(k, v)),
    getWithMetadata: ((k: string, o?: object) => timed(`getWithMetadata ${name}/${k}`, raw.getWithMetadata(k, o as never))) as typeof raw.getWithMetadata,
    set: (k: string, d: ArrayBuffer, o?: { metadata?: Record<string, unknown> }) => timed(`set ${name}/${k}`, raw.set(k, d, o)),
    delete: (k: string) => timed(`delete ${name}/${k}`, raw.delete(k)),
    list: (o?: { prefix?: string }) => timed(`list ${name}`, raw.list(o)),
  };
  return {
    async getJSON<T>(key: string) {
      return ((await store.get(key, { type: 'json' })) as T) ?? null;
    },
    async setJSON(key, value) {
      await store.setJSON(key, value);
    },
    async getBinary(key) {
      const r = await store.getWithMetadata(key, { type: 'arrayBuffer' });
      if (!r) return null;
      return { data: r.data, contentType: String(r.metadata?.contentType || 'application/octet-stream') };
    },
    async setBinary(key, data, contentType) {
      await store.set(key, data, { metadata: { contentType } });
    },
    async delete(key) {
      await store.delete(key);
    },
    async list(prefix) {
      const { blobs } = await store.list(prefix ? { prefix } : undefined);
      return blobs.map((b) => b.key);
    },
  };
}

function localDriver(name: StoreName): Driver {
  const root = path.join(process.cwd(), '.data', name);
  const file = (key: string) => path.join(root, encodeURIComponent(key));
  const ensure = () => fs.mkdir(root, { recursive: true });
  return {
    async getJSON<T>(key: string) {
      try {
        return JSON.parse(await fs.readFile(file(key), 'utf8')) as T;
      } catch {
        return null;
      }
    },
    async setJSON(key, value) {
      await ensure();
      await fs.writeFile(file(key), JSON.stringify(value));
    },
    async getBinary(key) {
      try {
        const buf = await fs.readFile(file(key));
        const meta = JSON.parse(await fs.readFile(file(key) + '.meta', 'utf8'));
        return { data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, contentType: meta.contentType };
      } catch {
        return null;
      }
    },
    async setBinary(key, data, contentType) {
      await ensure();
      await fs.writeFile(file(key), Buffer.from(data));
      await fs.writeFile(file(key) + '.meta', JSON.stringify({ contentType }));
    },
    async delete(key) {
      await fs.rm(file(key), { force: true });
      await fs.rm(file(key) + '.meta', { force: true });
    },
    async list(prefix) {
      try {
        const names = await fs.readdir(root);
        return names
          .filter((n) => !n.endsWith('.meta'))
          .map((n) => decodeURIComponent(n))
          .filter((k) => !prefix || k.startsWith(prefix));
      } catch {
        return [];
      }
    },
  };
}

export function storage(name: StoreName): Driver {
  return useLocal() ? localDriver(name) : netlifyDriver(name);
}
