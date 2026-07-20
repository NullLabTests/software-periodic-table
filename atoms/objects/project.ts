import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const ProjectMeta: AtomMeta = {
  id: 13,
  symbol: 'Pj',
  name: 'Project',
  family: 'objects',
  description: 'Time-bounded body of work.',
};

export const ProjectProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'name', type: 'string', required: true },
  { key: 'description', type: 'string' },
  {
    key: 'status',
    type: 'enum',
    enumValues: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
    required: true,
  },
  { key: 'priority', type: 'enum', enumValues: ['low', 'medium', 'high', 'urgent'] },
  { key: 'owner', type: 'reference', description: 'User id' },
  { key: 'startDate', type: 'date' },
  { key: 'endDate', type: 'date' },
  { key: 'budget', type: 'currency' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Project extends ObjectAtom {
  meta: typeof ProjectMeta;
  properties: {
    id: string;
    name: string;
    description?: string;
    status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    owner?: string;
    startDate?: string;
    endDate?: string;
    budget?: number;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createProject(input: {
  id: string;
  name: string;
  description?: string;
  status?: Project['properties']['status'];
  priority?: Project['properties']['priority'];
  owner?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
}): Project {
  const now = new Date().toISOString();
  return {
    meta: ProjectMeta,
    id: input.id,
    properties: {
      id: input.id,
      name: input.name,
      description: input.description,
      status: input.status ?? 'planning',
      priority: input.priority,
      owner: input.owner,
      startDate: input.startDate,
      endDate: input.endDate,
      budget: input.budget,
      createdAt: now,
      updatedAt: now,
    },
  };
}
