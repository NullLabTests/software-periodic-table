import type { AtomMeta } from '../core.js';

export const SummarizeMeta: AtomMeta = {
  id: 102,
  symbol: 'Sm',
  name: 'Summarize',
  family: 'intelligence',
  description: 'Condense content to key points.',
};

export interface SummarizeRequest {
  content: string;
  maxLength?: number;
  format?: 'paragraph' | 'bullets' | 'json';
}

export interface SummarizeResult {
  summary: string;
  originalLength: number;
  summaryLength: number;
}

export function createSummarize(req: SummarizeRequest): SummarizeRequest {
  return req;
}
