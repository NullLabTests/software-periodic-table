import type { AtomMeta } from '../core.js';

export const OwnerMeta: AtomMeta = {
  id: 51,
  symbol: 'Ow',
  name: 'Owner',
  family: 'properties',
  description: 'Responsible user or entity.',
};

export interface OwnerRef {
  userId: string;
  userName?: string;
  type?: 'user' | 'team' | 'role';
}
