import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const TemplateMeta: AtomMeta = {
  id: 32,
  symbol: 'Tp',
  name: 'Template',
  family: 'objects',
  description: 'Reusable structure or content skeleton.',
};

export const TemplateProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'name', type: 'string', required: true },
  { key: 'description', type: 'string' },
  { key: 'entityType', type: 'string', description: 'Type of entity this templates', required: true },
  { key: 'content', type: 'json', required: true },
  { key: 'variables', type: 'json', description: 'Array of variable names' },
  { key: 'isSystem', type: 'boolean' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Template extends ObjectAtom {
  meta: typeof TemplateMeta;
  properties: {
    id: string;
    name: string;
    description?: string;
    entityType: string;
    content: Record<string, unknown>;
    variables?: string[];
    isSystem?: boolean;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createTemplate(input: {
  id: string;
  name: string;
  description?: string;
  entityType: string;
  content: Record<string, unknown>;
  variables?: string[];
  isSystem?: boolean;
}): Template {
  const now = new Date().toISOString();
  return {
    meta: TemplateMeta,
    id: input.id,
    properties: {
      id: input.id,
      name: input.name,
      description: input.description,
      entityType: input.entityType,
      content: input.content,
      variables: input.variables,
      isSystem: input.isSystem,
      createdAt: now,
      updatedAt: now,
    },
  };
}
