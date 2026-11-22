import type { Flyer, Slot, Store } from './types';
import { getTheme } from './themes';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3] };
}

/** "October 8 to October 21, 2026" (adds the first year only when the years differ). */
export function formatDateRange(from: string, to: string): string {
  const a = parseYmd(from);
  const b = parseYmd(to);
  if (!a || !b) return '';
  const left = `${MONTHS[a.m - 1]} ${a.d}${a.y !== b.y ? `, ${a.y}` : ''}`;
  return `${left} to ${MONTHS[b.m - 1]} ${b.d}, ${b.y}`;
}

export function isDateRangeValid(from: string, to: string): boolean {
  if (!from || !to) return true;
  return to >= from;
}

/** Splits "19.99" into { dollars: "19", cents: "99" }. Returns null when not a valid price. */
export function splitPrice(raw: string): { dollars: string; cents: string } | null {
  const cleaned = (raw || '').replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!isFinite(n)) return null;
  const [d, c] = n.toFixed(2).split('.');
  return { dollars: d, cents: c };
}

export function isValidPrice(raw: string): boolean {
  return splitPrice(raw) !== null;
}

export function slotHasContent(s: Slot): boolean {
  return Boolean(s.name.trim() || s.itemNumber.trim() || s.salePrice.trim() || s.imageId);
}

/** A slot is shown on the flyer when it has a name or an image and a valid sale price. */
export function slotIsPrintable(s: Slot): boolean {
  return Boolean((s.name.trim() || s.imageId) && isValidPrice(s.salePrice));
}

function safe(s: string): string {
  return s.replace(/[^A-Za-z0-9-]+/g, '');
}

export function exportFileName(flyer: Flyer, store: Store | null, suffix: string, ext: string): string {
  const storePart = safe(store?.fileLabel || store?.displayName || 'Store') || 'Store';
  const themePart = safe(getTheme(flyer.themeId).fileLabel);
  const datePart = flyer.fromDate && flyer.toDate ? `${flyer.fromDate}_to_${flyer.toDate}` : 'undated';
  return `${storePart}_${themePart}_${datePart}${suffix ? `_${suffix}` : ''}.${ext}`;
}

export function newId(prefix = ''): string {
  const g = globalThis as { crypto?: Crypto };
  const rnd = g.crypto?.randomUUID
    ? g.crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    : Math.random().toString(36).slice(2, 18);
  return prefix + rnd;
}

export function emptySlot(): Slot {
  return {
    id: newId('s_'),
    itemNumber: '',
    itemType: 'AGLC',
    name: '',
    varieties: '',
    size: '',
    sizeCustom: '',
    container: 'cans',
    salePrice: '',
    regularPrice: '',
  };
}
