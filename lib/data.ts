import 'server-only';
import { storage } from './storage';
import { normalizeSettings } from './defaults';
import type { AppSettings, Flyer, FlyerSummary, Product, Slot } from './types';
import { hashPassword, type PasswordHash } from './auth';
import { newId, slotHasContent } from './format';

/* ---------------- settings ---------------- */

export async function getSettings(): Promise<AppSettings> {
  const s = await storage('settings').getJSON<AppSettings>('app');
  return normalizeSettings(s);
}

export async function saveSettings(s: AppSettings): Promise<AppSettings> {
  const n = normalizeSettings(s);
  await storage('settings').setJSON('app', n);
  return n;
}

/* ---------------- staff users ---------------- */

export interface StoredUser extends PasswordHash {
  username: string;
  createdAt: string;
}

export async function getUsers(): Promise<StoredUser[]> {
  return (await storage('settings').getJSON<StoredUser[]>('users')) ?? [];
}

export async function saveUsers(users: StoredUser[]): Promise<void> {
  await storage('settings').setJSON('users', users);
}

export async function upsertUser(username: string, password: string): Promise<void> {
  const users = await getUsers();
  const h = await hashPassword(password);
  const existing = users.find((u) => u.username === username);
  if (existing) Object.assign(existing, h);
  else users.push({ username, ...h, createdAt: new Date().toISOString() });
  await saveUsers(users);
}

export async function removeUser(username: string): Promise<void> {
  await saveUsers((await getUsers()).filter((u) => u.username !== username));
}

/* ---------------- flyers ---------------- */

const INDEX_KEY = '__index';

async function readIndex(): Promise<FlyerSummary[]> {
  return (await storage('flyers').getJSON<FlyerSummary[]>(INDEX_KEY)) ?? [];
}

async function writeIndex(idx: FlyerSummary[]): Promise<void> {
  await storage('flyers').setJSON(INDEX_KEY, idx);
}

export async function listFlyers(): Promise<FlyerSummary[]> {
  await ensureSeed();
  const idx = await readIndex();
  return idx.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getFlyer(id: string): Promise<Flyer | null> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
  return storage('flyers').getJSON<Flyer>(`f_${id}`);
}

function summarize(f: Flyer, storeName: string): FlyerSummary {
  return {
    id: f.id,
    title: f.title,
    storeId: f.storeId,
    storeName,
    themeId: f.themeId,
    fromDate: f.fromDate,
    toDate: f.toDate,
    sample: f.sample,
    updatedAt: f.updatedAt,
  };
}

export async function saveFlyer(input: Flyer, opts: { touchLibrary?: boolean } = {}): Promise<Flyer> {
  const now = new Date().toISOString();
  const id = input.id && /^[A-Za-z0-9_-]{1,64}$/.test(input.id) ? input.id : newId('f');
  const existing = await getFlyer(id);
  const flyer: Flyer = {
    ...input,
    id,
    slots: (input.slots || []).slice(0, 60),
    createdAt: existing?.createdAt || input.createdAt || now,
    updatedAt: now,
  };
  await storage('flyers').setJSON(`f_${id}`, flyer);
  const settings = await getSettings();
  const storeName = settings.stores.find((s) => s.id === flyer.storeId)?.displayName || '';
  const idx = (await readIndex()).filter((x) => x.id !== id);
  idx.push(summarize(flyer, storeName));
  await writeIndex(idx);
  if (opts.touchLibrary !== false) await addSlotsToLibrary(flyer.slots, flyer.sample);
  return flyer;
}

export async function deleteFlyer(id: string): Promise<void> {
  await storage('flyers').delete(`f_${id}`);
  await writeIndex((await readIndex()).filter((x) => x.id !== id));
}

export async function duplicateFlyer(id: string): Promise<Flyer | null> {
  const f = await getFlyer(id);
  if (!f) return null;
  const copy: Flyer = {
    ...structuredClone(f),
    id: newId('f'),
    title: f.title ? `${f.title} (copy)` : undefined,
    slots: f.slots.map((s) => ({ ...s, id: newId('s_') })),
    createdAt: new Date().toISOString(),
  };
  return saveFlyer(copy, { touchLibrary: false });
}

/* ---------------- product library ---------------- */

export function productKey(itemType: string, itemNumber: string): string {
  return `${itemType}:${itemNumber.trim().toUpperCase()}`;
}

export async function getProduct(itemType: string, itemNumber: string): Promise<Product | null> {
  if (!itemNumber.trim()) return null;
  await ensureSeed();
  const lib = storage('products');
  const exact = await lib.getJSON<Product>(productKey(itemType, itemNumber));
  if (exact) return exact;
  // Same number saved under the other number type is still a useful match.
  const other = itemType === 'AGLC' ? 'BDL' : 'AGLC';
  return lib.getJSON<Product>(productKey(other, itemNumber));
}

export async function searchProducts(q: string, limit = 15): Promise<Product[]> {
  await ensureSeed();
  const lib = storage('products');
  const keys = await lib.list();
  const all = (await Promise.all(keys.map((k) => lib.getJSON<Product>(k)))).filter(Boolean) as Product[];
  const needle = q.trim().toLowerCase();
  const hits = needle
    ? all.filter((p) =>
        [p.itemNumber, p.name, p.varieties].some((v) => (v || '').toLowerCase().includes(needle)),
      )
    : all;
  return hits.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
}

export async function addSlotsToLibrary(slots: Slot[], sample?: boolean): Promise<void> {
  const lib = storage('products');
  const now = new Date().toISOString();
  await Promise.all(
    slots
      .filter((s) => slotHasContent(s) && s.itemNumber.trim() && s.name.trim())
      .map((s) =>
        lib.setJSON(productKey(s.itemType, s.itemNumber), {
          itemNumber: s.itemNumber.trim().toUpperCase(),
          itemType: s.itemType,
          name: s.name.trim(),
          varieties: s.varieties.trim(),
          size: s.size,
          sizeCustom: s.sizeCustom,
          container: s.container,
          lastPrice: s.salePrice,
          imageId: s.imageId,
          sample: sample || undefined,
          updatedAt: now,
        } satisfies Product),
      ),
  );
}

/* ---------------- images ---------------- */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function sniffImageType(buf: ArrayBuffer): string | null {
  const b = new Uint8Array(buf.slice(0, 12));
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
    return 'image/webp';
  return null;
}

export async function saveImage(data: ArrayBuffer): Promise<string> {
  if (data.byteLength > MAX_IMAGE_BYTES) throw new Error('Image is larger than 10 MB.');
  const type = sniffImageType(data);
  if (!type) throw new Error('Only PNG, JPG and WebP images are supported.');
  const id = newId('img');
  await storage('images').setBinary(id, data, type);
  return id;
}

export async function getImage(id: string) {
  if (!/^img[A-Za-z0-9]{1,40}$/.test(id)) return null;
  return storage('images').getBinary(id);
}

/* ---------------- seed ---------------- */

let seedChecked = false;

export async function ensureSeed(): Promise<void> {
  if (seedChecked) return;
  const settings = storage('settings');
  const done = await settings.getJSON<{ at: string }>('seeded');
  if (!done) {
    const { buildCamroseSample } = await import('./seed');
    await saveFlyer(buildCamroseSample());
    await settings.setJSON('seeded', { at: new Date().toISOString() });
  }
  seedChecked = true;
}
