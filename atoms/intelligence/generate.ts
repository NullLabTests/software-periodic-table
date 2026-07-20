import type { AtomMeta } from '../core.js';

export const GenerateMeta: AtomMeta = {
  id: 105,
  symbol: 'Gn',
  name: 'Generate',
  family: 'intelligence',
  description: 'Create new content or structure.',
};

export interface GenerateRequest {
  prompt: string;
  format?: 'text' | 'json' | 'code' | 'html';
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateResult {
  content: string;
  finishReason: string;
  tokensUsed: number;
}

export function createGenerate(req: GenerateRequest): GenerateRequest {
  return req;
}
