import type { AtomMeta } from '../core.js';

export const PriorityMeta: AtomMeta = {
  id: 56,
  symbol: 'Py',
  name: 'Priority',
  family: 'properties',
  description: 'Relative importance ranking.',
};

export const CommonPriorityValues = ['low', 'medium', 'high', 'urgent'] as const;

export type PriorityValue = (typeof CommonPriorityValues)[number];
