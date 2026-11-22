// Connect Logistics / BDL provider: STUB, same approach as Liquor Connect.
// Skipped quietly unless the environment variables below are set.
import type { LookupProvider, LookupResult } from './types';

function config() {
  return {
    baseUrl: process.env.BDL_API_URL || '',
    username: process.env.BDL_USERNAME || '',
    password: process.env.BDL_PASSWORD || '',
    apiKey: process.env.BDL_API_KEY || '',
  };
}

async function fetchProduct(_number: string): Promise<LookupResult | null> {
  // TODO: authenticate with config() and fetch the product by BDL / Connect Logistics number.
  return null;
}

export const bdlProvider: LookupProvider = {
  id: 'bdl',
  label: 'Connect Logistics / BDL',
  isConfigured() {
    const c = config();
    return Boolean(c.baseUrl && ((c.username && c.password) || c.apiKey));
  },
  async lookup(q) {
    if (q.itemType !== 'BDL') return null;
    return fetchProduct(q.itemNumber);
  },
};
