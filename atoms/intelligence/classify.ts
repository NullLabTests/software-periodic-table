import type { AtomMeta } from '../core.js';

export const ClassifyMeta: AtomMeta = {
  id: 104,
  symbol: 'Cs',
  name: 'Classify',
  family: 'intelligence',
  description: 'Assign category or label.',
};

export interface ClassifyRequest {
  input: string;
  categories: string[];
  multiLabel?: boolean;
}

export interface ClassifyResult {
  category: string;
  confidence: number;
  scores?: Record<string, number>;
}

export function createClassify(req: ClassifyRequest): ClassifyRequest {
  return req;
}
