import type { AtomMeta } from '../core.js';

export const ExtractMeta: AtomMeta = {
  id: 103,
  symbol: 'Ec',
  name: 'Extract',
  family: 'intelligence',
  description: 'Pull structured data from unstructured input.',
};

export interface ExtractRequest {
  source: string;
  schema: Record<string, string>;
  sourceType?: 'text' | 'document' | 'image' | 'audio';
}

export interface ExtractResult {
  data: Record<string, unknown>;
  confidence: number;
}

export function createExtract(req: ExtractRequest): ExtractRequest {
  return req;
}
