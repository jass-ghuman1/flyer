import 'server-only';
import type { AppSettings, Flyer } from './types';
import { getTheme } from './themes';
import { formatDateRange, slotIsPrintable, splitPrice } from './format';
import { isLargeSize, sizeLabel } from './sizes';

export interface PromptImage {
  imageId: string;
  /** File name without extension; the extension is added from the real image type. */
  baseName: string;
}

const EXT_TOKEN = '{ext:';

/**
 * Builds a copy-and-paste prompt for ChatGPT / Grok to design the flyer, plus the images to attach.
 * Image file names appear in the text as {ext:item-01}; call finalizePrompt() once the real file types are known.
 */
export function buildAiPrompt(flyer: Flyer, settings: AppSettings): { subject: string; text: string; images: PromptImage[] } {
  const store = settings.stores.find((s) => s.id === flyer.storeId);
  const theme = getTheme(flyer.themeId);
  const dates = formatDateRange(flyer.fromDate, flyer.toDate) || '[SALE DATES NOT SET]';
  const items = flyer.slots.filter(slotIsPrintable);
  const images: PromptImage[] = [];

  if (store?.logoImageId) images.push({ imageId: store.logoImageId, baseName: 'logo' });

  const money = (v: string) => {
    const p = splitPrice(v);
    return p ? `$${p.dollars}.${p.cents}` : '';
  };

  const lines = items.map((s, i) => {
    let img = 'no image (use a neutral bottle/can/box silhouette, do not invent branding)';
    if (s.imageId) {
      const base = `item-${String(i + 1).padStart(2, '0')}`;
      images.push({ imageId: s.imageId, baseName: base });
      img = `attached image "${EXT_TOKEN}${base}}"`;
    }
    const reg = money(s.regularPrice);
    return [
      `${i + 1}. ${s.name.trim()}${isLargeSize(s.size) ? '  [LARGE CELL: double width]' : ''}`,
      s.varieties.trim() ? `   Varieties: ${s.varieties.trim()}` : '',
      sizeLabel(s) ? `   Size: ${sizeLabel(s)}` : '',
      `   Sale price: ${money(s.salePrice)}${reg ? `   (Regular price: ${reg}, show smaller)` : ''}`,
      s.itemNumber.trim() ? `   Item #: ${s.itemType} ${s.itemNumber.trim()} (reference only, do not print)` : '',
      `   Image: ${img}`,
    ]
      .filter(Boolean)
      .join('\n');
  });

  const missing = (v: string | undefined, label: string) => (v && v.trim() ? v.trim() : `[${label}: NOT SET, leave a clearly marked blank]`);
  const hours = store?.hours.filter(Boolean).join(' | ') || '';

  const text = `You are a professional retail graphic designer. Design a print-ready liquor store sale flyer using EXACTLY the information below. Do not change, round or invent any product name, price, date, phone number, address or hours. If something is marked NOT SET, leave a clearly marked blank space instead of making it up.

FORMAT
- Portrait, US Letter (8.5 x 11 in), print quality. Also suitable to crop for a 1080 x 1350 social post.
- Layout: header band at top, a headline ribbon under it, a product grid filling the middle, footer band at the bottom.
- Prices in "$19.99" style: large dollars, small raised cents, bold red. Brand names bold and easy to read.
- Items marked LARGE CELL (4 L boxes, 24/30/36 packs) get a double-width cell. The grid must have no empty gaps.
- Keep all text inside its cell; shrink long names rather than letting them overflow.

THEME
- Season / theme: ${theme.name}
- Headline ribbon text: "${flyer.headline || theme.headline}"
- Style: seasonal ${theme.name} background art and colours (main colour ${theme.colors.primary}, accent ${theme.colors.accent}). Keep decoration around the edges so products stay readable.

HEADER (store)
- Store name: ${missing(store?.displayName, 'STORE NAME')}${store?.logoImageId ? ` (use the attached logo "${EXT_TOKEN}logo}")` : ''}
- Address: ${store?.addressLines.filter(Boolean).join(', ') || '[ADDRESS: NOT SET]'}${store?.locationNote ? `\n- Location note: ${store.locationNote}` : ''}
- Hours: ${hours || '[HOURS: NOT SET, leave a clearly marked blank]'}
- Phone: ${missing(store?.phone, 'PHONE')}

PRODUCTS (${items.length} items, keep this order)
${lines.join('\n')}

FOOTER (print these lines exactly)
- Prices do not include GST & Bottle Deposit
- Price Match Guarantee
- Sale prices in effect from ${dates}
${store?.skipTheDishes ? '- "Delivery available on SkipTheDishes" badge\n' : ''}- 10% off your next purchase when you sign up for our newsletter
- Newsletter QR code linking to: ${store?.qrLink?.trim() || '[QR LINK: NOT SET, leave a marked square placeholder]'}

Before finishing, check every price and product name against this list.`;

  const storeLabel = store?.fileLabel || store?.displayName || 'Store';
  const subject = `Flyer request: ${storeLabel}, ${theme.name}, ${dates}`;
  return { subject, text, images };
}

/** Replaces {ext:name} tokens with real file names (name.png / name.jpg / name.webp). */
export function finalizePrompt(text: string, fileNames: Record<string, string>): string {
  return text.replace(/\{ext:([a-z0-9-]+)\}/g, (_m, base: string) => fileNames[base] || `${base} (image missing)`);
}
