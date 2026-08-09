import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const WorkflowMeta: AtomMeta = {
  id: 31,
  symbol: 'Wf',
  name: 'Workflow',
  family: 'objects',
  description: 'Defined sequence of steps.',
};

export const WorkflowProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'name', type: 'string', required: true },
  { key: 'description', type: 'string' },
  { key: 'steps', type: 'json', description: 'Array of step definitions', required: true },
  { key: 'trigger', type: 'json', description: 'Trigger definition' },
  { key: 'status', type: 'enum', enumValues: ['draft', 'active', 'paused', 'archived'], required: true },
  { key: 'version', type: 'number' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Workflow extends ObjectAtom {
  meta: typeof WorkflowMeta;
  properties: {
    id: string;
    name: string;
    description?: string;
    steps: unknown[];
    trigger?: Record<string, unknown>;
    status: 'draft' | 'active' | 'paused' | 'archived';
    version?: number;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createWorkflow(input: {
  id: string;
  name: string;
  description?: string;
  steps: unknown[];
  trigger?: Record<string, unknown>;
  version?: number;
}): Workflow {
  const now = new Date().toISOString();
  return {
    meta: WorkflowMeta,
    id: input.id,
    properties: {
      id: input.id,
      name: input.name,
      description: input.description,
      steps: input.steps,
      trigger: input.trigger,
      status: 'draft',
      version: input.version ?? 1,
      createdAt: now,
      updatedAt: now,
    },
  };
}
