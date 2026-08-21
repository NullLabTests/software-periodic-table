import type { AtomMeta } from '../core.js';

export const UrlMeta: AtomMeta = {
  id: 44,
  symbol: 'Ur',
  name: 'URL',
  family: 'properties',
  description: 'Web address.',
};

export type UrlValue = string;

export function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
