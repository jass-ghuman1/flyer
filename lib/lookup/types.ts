import type { ContainerType, ItemNumberType } from '../types';

export interface LookupQuery {
  itemNumber: string;
  itemType: ItemNumberType;
}

export interface LookupResult {
  name?: string;
  varieties?: string;
  size?: string;
  sizeCustom?: string;
  container?: ContainerType;
  imageId?: string; // already stored in our image store
  imageUrl?: string; // remote image; imported by the lookup service
}

export interface LookupProvider {
  id: string;
  label: string;
  /** False when the provider has no credentials/config; it is then skipped quietly. */
  isConfigured(): boolean;
  lookup(q: LookupQuery): Promise<LookupResult | null>;
}
