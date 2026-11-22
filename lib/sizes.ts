import type { Slot } from './types';

export const SIZE_OPTIONS = [
  { value: '750ml', label: '750 ml', pack: false },
  { value: '1L', label: '1 L', pack: false },
  { value: '1.14L', label: '1.14 L', pack: false },
  { value: '1.75L', label: '1.75 L', pack: false },
  { value: '4L', label: '4 L', pack: false },
  { value: '6pk', label: '6 pack', pack: true },
  { value: '8pk', label: '8 pack', pack: true },
  { value: '12pk', label: '12 pack', pack: true },
  { value: '15pk', label: '15 pack', pack: true },
  { value: '24pk', label: '24 pack', pack: true },
  { value: '30pk', label: '30 pack', pack: true },
  { value: '36pk', label: '36 pack', pack: true },
  { value: 'custom', label: 'Custom', pack: false },
] as const;

/** Sizes that automatically get a double-width cell. */
export const LARGE_SIZES = new Set(['4L', '24pk', '30pk', '36pk']);

export function isPackSize(size: string): boolean {
  return SIZE_OPTIONS.some((s) => s.value === size && s.pack);
}

export function isLargeSize(size: string): boolean {
  return LARGE_SIZES.has(size);
}

export function sizeLabel(slot: Pick<Slot, 'size' | 'sizeCustom' | 'container'>): string {
  if (!slot.size) return '';
  if (slot.size === 'custom') return slot.sizeCustom.trim();
  const opt = SIZE_OPTIONS.find((s) => s.value === slot.size);
  if (!opt) return slot.size;
  return opt.pack ? `${opt.label} ${slot.container}` : opt.label;
}
