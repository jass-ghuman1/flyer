export type ThemeId =
  | 'fall'
  | 'christmas'
  | 'newyear'
  | 'valentines'
  | 'spring'
  | 'summer'
  | 'canadaday'
  | 'halloween'
  | 'generic';

export type ItemNumberType = 'AGLC' | 'BDL';

export type ContainerType = 'cans' | 'bottles';

export interface Slot {
  id: string;
  itemNumber: string;
  itemType: ItemNumberType;
  name: string;
  varieties: string;
  size: string; // one of SIZE_OPTIONS values, '' or 'custom'
  sizeCustom: string;
  container: ContainerType;
  salePrice: string; // kept as typed, e.g. "19.99"
  regularPrice: string;
  imageId?: string;
  imageOriginalId?: string; // set when "remove background" produced imageId
  bgRemoved?: boolean;
}

export interface Flyer {
  id: string;
  title?: string;
  themeId: ThemeId;
  headline: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  storeId: string;
  slots: Slot[];
  sample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Store {
  id: string;
  displayName: string;
  fileLabel: string; // short label used in export file names
  addressLines: string[];
  locationNote: string;
  hours: string[];
  phone: string;
  qrLink: string;
  logoImageId?: string;
  skipTheDishes: boolean;
}

export interface ThemeSetting {
  headline: string;
  backgroundImageId?: string;
}

export interface AppSettings {
  stores: Store[];
  themes: Record<ThemeId, ThemeSetting>;
  defaultSlotCount: number;
}

export interface Product {
  itemNumber: string;
  itemType: ItemNumberType;
  name: string;
  varieties: string;
  size: string;
  sizeCustom: string;
  container: ContainerType;
  lastPrice: string;
  imageId?: string;
  sample?: boolean;
  updatedAt: string;
}

export interface FlyerSummary {
  id: string;
  title?: string;
  storeId: string;
  storeName: string;
  themeId: ThemeId;
  fromDate: string;
  toDate: string;
  sample?: boolean;
  updatedAt: string;
}

export type ExportFormat = 'letter' | 'tabloid' | 'square' | 'portrait';

/** Everything the flyer renderer needs, so preview and export use identical input. */
export interface FlyerRenderInput {
  flyer: Flyer;
  store: Store | null;
  theme: ThemeSetting;
}

export interface SessionInfo {
  u: string;
  r: 'staff' | 'admin';
  exp: number;
}
