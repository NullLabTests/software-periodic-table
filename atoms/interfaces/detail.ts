import type { AtomMeta, InterfaceSpec } from '../core.js';

export const DetailMeta: AtomMeta = {
  id: 96,
  symbol: 'Di',
  name: 'Detail',
  family: 'interfaces',
  description: 'Single-object focused view.',
};

export interface DetailSection {
  title: string;
  fields: { key: string; label: string; type?: string }[];
}

export interface DetailSpec extends InterfaceSpec {
  kind: 'Detail';
  sections: DetailSection[];
  actions?: string[];
}

export function defineDetail(opts: { objectType: string; sections: DetailSection[]; actions?: string[] }): DetailSpec {
  return {
    kind: 'Detail',
    objectType: opts.objectType,
    sections: opts.sections,
    actions: opts.actions ?? ['View', 'Update', 'Delete'],
  };
}

export function materializeDetail(
  spec: DetailSpec,
  data: Record<string, unknown>,
): { sections: DetailSection[]; data: Record<string, unknown>; spec: DetailSpec } {
  return {
    sections: spec.sections,
    data,
    spec,
  };
}
