import type { AtomMeta } from '../core.js';

export const EnumMeta: AtomMeta = {
  id: 49,
  symbol: 'En',
  name: 'Enum',
  family: 'properties',
  description: 'Constrained set of values.',
};

/** Constrains a value to a fixed vocabulary. Prefer shared vocabularies over ad-hoc ones. */
export function assertEnumValue<T extends readonly string[]>(value: string, allowed: T): asserts value is T[number] {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`Invalid value "${value}". Allowed: ${allowed.join(', ')}`);
  }
}
