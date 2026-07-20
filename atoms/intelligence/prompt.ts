import type { AtomMeta } from '../core.js';

export const PromptMeta: AtomMeta = {
  id: 106,
  symbol: 'Pt',
  name: 'Prompt',
  family: 'intelligence',
  description: 'Structured instruction to a model.',
};

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PromptRequest {
  messages: PromptMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'text' | 'json_object' };
}

export interface PromptResponse {
  content: string;
  model: string;
  usage: { prompt: number; completion: number; total: number };
}

export function createPrompt(req: PromptRequest): PromptRequest {
  return req;
}
