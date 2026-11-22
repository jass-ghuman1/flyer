// Fallback public product search using Google Programmable Search (Custom Search JSON API).
// Needs GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID. Skipped when they are not set.
// Item numbers are retailer SKUs, so results can be wrong: staff should always check what it fills in.
import type { LookupProvider, LookupResult } from './types';

interface CseItem {
  title?: string;
  link?: string;
  pagemap?: { cse_image?: { src?: string }[]; product?: { name?: string }[] };
}

export const publicSearchProvider: LookupProvider = {
  id: 'public-search',
  label: 'Public product search',
  isConfigured: () => Boolean(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID),
  async lookup(q) {
    const extra = process.env.GOOGLE_CSE_QUERY_SUFFIX || 'Alberta liquor';
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', process.env.GOOGLE_CSE_API_KEY!);
    url.searchParams.set('cx', process.env.GOOGLE_CSE_ID!);
    url.searchParams.set('q', `"${q.itemNumber}" ${extra}`);
    url.searchParams.set('num', '5');
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: CseItem[] };
    const item = data.items?.find((i) => i.pagemap?.cse_image?.[0]?.src || i.pagemap?.product?.[0]?.name);
    if (!item) return null;
    const out: LookupResult = {};
    const name = item.pagemap?.product?.[0]?.name || item.title?.split(/[|\-–]/)[0]?.trim();
    if (name) out.name = name.slice(0, 80);
    const img = item.pagemap?.cse_image?.[0]?.src;
    if (img && /^https:\/\//.test(img)) out.imageUrl = img;
    return out.name || out.imageUrl ? out : null;
  },
};
