import type { AtomMeta, InterfaceSpec } from '../core.js';

export const FormMeta: AtomMeta = {
  id: 99,
  symbol: 'Fm',
  name: 'Form',
  family: 'interfaces',
  description: 'Input surface for creation or editing.',
};

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'date' | 'select' | 'textarea' | 'boolean';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: unknown;
}

export interface FormSpec extends InterfaceSpec {
  kind: 'Form';
  fields: FormField[];
  submitLabel?: string;
  cancelLabel?: string;
  layout?: 'vertical' | 'horizontal' | 'inline';
}

export function defineForm(opts: {
  objectType: string;
  fields: FormField[];
  submitLabel?: string;
  cancelLabel?: string;
  layout?: FormSpec['layout'];
}): FormSpec {
  return {
    kind: 'Form',
    objectType: opts.objectType,
    fields: opts.fields,
    submitLabel: opts.submitLabel ?? 'Save',
    cancelLabel: opts.cancelLabel ?? 'Cancel',
    layout: opts.layout ?? 'vertical',
    actions: ['Create', 'Update'],
  };
}

export function materializeForm(
  spec: FormSpec,
  data?: Record<string, unknown>,
): { fields: FormField[]; values: Record<string, unknown>; spec: FormSpec } {
  return {
    fields: spec.fields,
    values: data ?? {},
    spec,
  };
}
