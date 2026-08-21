import type { AtomMeta } from '../core.js';

export const AddressMeta: AtomMeta = {
  id: 47,
  symbol: 'Ad',
  name: 'Address',
  family: 'properties',
  description: 'Physical or postal address.',
};

export interface AddressValue {
  line1: string;
  line2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  /** ISO 3166-1 alpha-2 code recommended. */
  country?: string;
}

export function formatAddress(address: AddressValue): string {
  return [address.line1, address.line2, address.city, address.region, address.postalCode, address.country]
    .filter((part) => part !== undefined && part.trim().length > 0)
    .join(', ');
}
