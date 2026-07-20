import type { AtomMeta } from '../core.js';

export const CurrencyMeta: AtomMeta = {
  id: 41,
  symbol: 'Cu',
  name: 'Currency',
  family: 'properties',
  description: 'Monetary amount with unit.',
};

export interface CurrencyValue {
  amount: number;
  code: string;
}

export const CommonCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'] as const;
