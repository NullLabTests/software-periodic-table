import type { AtomMeta } from '../core.js';

export const EmailMeta: AtomMeta = {
  id: 45,
  symbol: 'Ea',
  name: 'Email',
  family: 'properties',
  description: 'Email address field.',
};

export type EmailValue = string;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
