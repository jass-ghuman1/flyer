// AGLC Liquor Connect provider: STUB.
// Liquor Connect requires a retailer login and does not publish a public API. This provider reads its
// configuration from environment variables and is skipped quietly when they are not set.
// To complete it later, implement `fetchProduct` against whatever access AGLC grants (API or export file).
import type { LookupProvider, LookupResult } from './types';

function config() {
  return {
    baseUrl: process.env.LIQUORCONNECT_API_URL || '',
    username: process.env.LIQUORCONNECT_USERNAME || '',
    password: process.env.LIQUORCONNECT_PASSWORD || '',
    apiKey: process.env.LIQUORCONNECT_API_KEY || '',
  };
}

async function fetchProduct(_sku: string): Promise<LookupResult | null> {
  // TODO: authenticate with config() and fetch the product by SKU.
  // Map the response to { name, varieties, size, sizeCustom, container, imageUrl }.
  return null;
}

export const liquorConnectProvider: LookupProvider = {
  id: 'liquorconnect',
  label: 'AGLC Liquor Connect',
  isConfigured() {
    const c = config();
    return Boolean(c.baseUrl && ((c.username && c.password) || c.apiKey));
  },
  async lookup(q) {
    if (q.itemType !== 'AGLC') return null;
    return fetchProduct(q.itemNumber);
  },
};
