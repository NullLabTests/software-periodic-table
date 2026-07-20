import type { AtomMeta } from '../core.js';

export const SearchMeta: AtomMeta = {
  id: 101,
  symbol: 'Sr',
  name: 'Search',
  family: 'intelligence',
  description: 'Semantic or keyword retrieval.',
};

export interface SearchRequest {
  query: string;
  objectType?: string;
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  results: unknown[];
  total: number;
  query: string;
}

export function createSearch(req: SearchRequest): SearchRequest {
  return req;
}
