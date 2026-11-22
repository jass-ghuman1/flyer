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

function netlifyDriver(name: StoreName): Driver {
  const store = getStore({ name: `flyer-builder-${name}`, consistency: 'strong' });
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
