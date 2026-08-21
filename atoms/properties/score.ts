import type { AtomMeta } from '../core.js';
import { clampNumber } from './number.js';

export const ScoreMeta: AtomMeta = {
  id: 57,
  symbol: 'Sk',
  name: 'Score',
  family: 'properties',
  description: 'Numeric evaluation or ranking.',
};

/** A score normalized to [0, 1]. */
export type ScoreValue = number;

/** Normalizes a raw score from [min, max] to [0, 1]. */
export function normalizeScore(value: number, min = 0, max = 100): ScoreValue {
  if (max === min) return 0;
  return clampNumber((value - min) / (max - min), 0, 1);
}
