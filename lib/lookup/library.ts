import { getProduct } from '../data';
import type { LookupProvider } from './types';

export const libraryProvider: LookupProvider = {
  id: 'library',
  label: 'Product library',
  isConfigured: () => true,
  async lookup(q) {
    const p = await getProduct(q.itemType, q.itemNumber);
    if (!p) return null;
    return {
      name: p.name,
      varieties: p.varieties,
      size: p.size,
      sizeCustom: p.sizeCustom,
      container: p.container,
      imageId: p.imageId,
    };
  },
};
