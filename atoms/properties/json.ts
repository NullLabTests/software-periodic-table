import type { AtomMeta } from '../core.js';

export const JsonMeta: AtomMeta = {
  id: 48,
  symbol: 'Js',
  name: 'JSON',
  family: 'properties',
  description: 'Structured JSON data.',
};

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

/** Parses JSON and returns undefined instead of throwing on invalid input. */
export function parseJson<T extends JsonValue = JsonValue>(raw: string): T | undefined {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}
