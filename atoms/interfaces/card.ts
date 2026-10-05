import type { AtomMeta, InterfaceSpec } from '../core.js';

export const CardMeta: AtomMeta = {
  id: 97,
  symbol: 'Cd',
  name: 'Card',
  family: 'interfaces',
  description: 'Compact summary container.',
};

export interface CardField {
  key: string;
  label: string;
  /** Truncate the rendered value past this many characters. */
  maxLength?: number;
}

export interface CardSpec extends InterfaceSpec {
  kind: 'Card';
  titleKey: string;
  fields: CardField[];
  /** Whole-record search text, used when the card is one result in a grid. */
  linkKey?: string;
  badges?: string[];
}

export function defineCard(opts: {
  objectType: string;
  titleKey: string;
  fields: CardField[];
  linkKey?: string;
  badges?: string[];
}): CardSpec {
  return {
    kind: 'Card',
    objectType: opts.objectType,
    titleKey: opts.titleKey,
    fields: opts.fields,
    linkKey: opts.linkKey ?? 'id',
    badges: opts.badges ?? [],
    actions: ['View', 'Update'],
  };
}

export interface RenderedCard {
  id: string;
  title: string;
  fields: { key: string; label: string; value: unknown; display: string; truncated: boolean }[];
  badges: string[];
  href?: string;
}

/**
 * Render records as compact summaries.
 *
 * A field whose value exceeds `maxLength` is truncated and flagged so the caller
 * can show that there is more, instead of a value that quietly stops early. A
 * missing value renders empty rather than "undefined".
 */
export function materializeCards(spec: CardSpec, records: Record<string, unknown>[]): RenderedCard[] {
  return records.map((record) => {
    const id = String(record.id ?? '');
    return {
      id,
      title: String(record[spec.titleKey] ?? ''),
      fields: spec.fields.map((field) => {
        const value = record[field.key];
        const display = value === null || value === undefined ? '' : String(value);
        // `maxLength` bounds the whole rendered value, ellipsis included, so a
        // card column keeps a predictable width instead of one character over.
        const limit = field.maxLength;
        const truncated = limit !== undefined && display.length > limit;
        return {
          key: field.key,
          label: field.label,
          value,
          display: truncated ? `${display.slice(0, Math.max(0, limit - 1))}…` : display,
          truncated,
        };
      }),
      badges: (spec.badges ?? [])
        .map((key) => record[key])
        .filter((value): value is string => value !== undefined && value !== null && value !== ''),
      href: spec.linkKey ? `#/${spec.objectType}/${String(record[spec.linkKey] ?? id)}` : undefined,
    };
  });
}

/** The card for one record, or undefined when the record is not in the set. */
export function findCard(cards: RenderedCard[], id: string): RenderedCard | undefined {
  return cards.find((card) => card.id === id);
}
