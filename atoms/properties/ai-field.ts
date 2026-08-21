import type { AtomMeta } from '../core.js';

export const AiFieldMeta: AtomMeta = {
  id: 60,
  symbol: 'Ai',
  name: 'AI',
  family: 'properties',
  description: 'AI-generated or AI-augmented field.',
};

/** Wraps any value with provenance metadata so AI output is auditable. */
export interface AiFieldValue<T = unknown> {
  value: T;
  model?: string;
  promptVersion?: string;
  /** Confidence in [0, 1], when the model reports one. */
  confidence?: number;
  /** ISO 8601. */
  generatedAt?: string;
}

export function markAiGenerated<T>(
  value: T,
  options: Omit<AiFieldValue<T>, 'value' | 'generatedAt'> = {},
): AiFieldValue<T> {
  return { value, generatedAt: new Date().toISOString(), ...options };
}

export function isAiGenerated(field: unknown): field is AiFieldValue {
  return (
    typeof field === 'object' &&
    field !== null &&
    'value' in field &&
    'generatedAt' in (field as Record<string, unknown>)
  );
}
