import type { AtomMeta } from '../core.js';

export const PhoneMeta: AtomMeta = {
  id: 46,
  symbol: 'Ph',
  name: 'Phone',
  family: 'properties',
  description: 'Telephone number.',
};

export type PhoneValue = string;

/** Strips formatting characters; keeps a leading + and digits (E.164-friendly). */
export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/[^\d]/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}
