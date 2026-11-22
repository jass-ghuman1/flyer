import type { AppSettings, Store, ThemeId, ThemeSetting } from './types';
import { THEMES } from './themes';

/**
 * Store details supplied by the owner. Anything not supplied is left EMPTY on purpose;
 * the flyer shows an "admin to set" placeholder until an admin fills it in Settings.
 * SkipTheDishes defaults: on for Camrose (per the reference flyer), off elsewhere until an admin confirms.
 */
export const DEFAULT_STORES: Store[] = [
  {
    id: 'beaumont',
    displayName: 'Signature Liquor, Wine & Beer',
    fileLabel: 'Beaumont',
    addressLines: ['4904 30 Ave 101/103', 'Beaumont, AB T4X 1V1'],
    locationNote: '',
    hours: ['Mon-Thu 10AM-11PM', 'Fri-Sat 10AM-12AM', 'Sun 10AM-11PM'],
    phone: '780-737-1227',
    qrLink: '',
    skipTheDishes: false,
  },
  {
    id: 'stony-plain',
    displayName: 'Stony Liquor Discounter',
    fileLabel: 'StonyPlain',
    addressLines: ['3009 43 Ave #135', 'Stony Plain, AB T7Z 0H4'],
    locationNote: '',
    hours: [],
    phone: '780-963-0503',
    qrLink: '',
    skipTheDishes: false,
  },
  {
    id: 'wainwright',
    displayName: 'Sky Liquor Discounter',
    fileLabel: 'Wainwright',
    addressLines: ['2840 13th Ave Unit 10', 'Wainwright, AB T9W 0A2'],
    locationNote: '',
    hours: [],
    phone: '780-806-5800',
    qrLink: '',
    skipTheDishes: false,
  },
  {
    id: 'camrose',
    displayName: 'Camrose Liquor Discounter',
    fileLabel: 'Camrose',
    addressLines: ['4813 68 St #105', 'Camrose, AB T4V 5C1'],
    locationNote: 'Next to Save On Foods',
    hours: ['Mon-Sat 9AM-12AM', 'Sun 9AM-11PM'],
    phone: '587-987-3394',
    qrLink: '',
    skipTheDishes: true,
  },
  {
    id: 'edmonton',
    displayName: 'Signature Wines, Spirits & Craft Beer / Sky Liquor Edmonton',
    fileLabel: 'Edmonton',
    addressLines: ['8924 149 St', 'Edmonton, AB T5R 1B8'],
    locationNote: '',
    hours: ['Mon-Thu 10AM-11PM', 'Fri-Sat 10AM-12AM', 'Sun 10AM-11PM'],
    phone: '780-969-0401',
    qrLink: '',
    skipTheDishes: false,
  },
];

export const DEFAULT_SLOT_COUNT = 20;
export const MAX_SLOTS = 40;

export function defaultThemeSettings(): Record<ThemeId, ThemeSetting> {
  const out = {} as Record<ThemeId, ThemeSetting>;
  for (const t of THEMES) out[t.id] = { headline: t.headline };
  return out;
}

export function defaultSettings(): AppSettings {
  return {
    stores: structuredClone(DEFAULT_STORES),
    themes: defaultThemeSettings(),
    defaultSlotCount: DEFAULT_SLOT_COUNT,
  };
}

/** Fills in anything missing (e.g. a theme added in a later version). */
export function normalizeSettings(s: Partial<AppSettings> | null | undefined): AppSettings {
  const base = defaultSettings();
  if (!s) return base;
  const themes = { ...base.themes };
  for (const t of THEMES) {
    const v = s.themes?.[t.id];
    if (v) themes[t.id] = { headline: v.headline ?? t.headline, backgroundImageId: v.backgroundImageId || undefined };
  }
  const n = Number(s.defaultSlotCount);
  return {
    stores: Array.isArray(s.stores) && s.stores.length ? s.stores : base.stores,
    themes,
    defaultSlotCount: Number.isInteger(n) && n >= 1 && n <= MAX_SLOTS ? n : base.defaultSlotCount,
  };
}
