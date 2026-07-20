import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const TaskMeta: AtomMeta = {
  id: 14,
  symbol: 'Tk',
  name: 'Task',
  family: 'objects',
  description: 'Unit of work.',
};

export const TaskProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'title', type: 'string', required: true },
  { key: 'description', type: 'string' },
  { key: 'status', type: 'enum', enumValues: ['backlog', 'todo', 'in_progress', 'done', 'cancelled'], required: true },
  { key: 'priority', type: 'enum', enumValues: ['low', 'medium', 'high', 'urgent'] },
  { key: 'owner', type: 'reference', description: 'User id' },
  { key: 'projectId', type: 'reference' },
  { key: 'dueDate', type: 'date' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Task extends ObjectAtom {
  meta: typeof TaskMeta;
  properties: {
    id: string;
    title: string;
    description?: string;
    status: 'backlog' | 'todo' | 'in_progress' | 'done' | 'cancelled';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    owner?: string;
    projectId?: string;
    dueDate?: string;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createTask(input: {
  id: string;
  title: string;
  description?: string;
  status?: Task['properties']['status'];
  priority?: Task['properties']['priority'];
  owner?: string;
  projectId?: string;
  dueDate?: string;
}): Task {
  const now = new Date().toISOString();
  return {
    meta: TaskMeta,
    id: input.id,
    properties: {
      id: input.id,
      title: input.title,
      description: input.description,
      status: input.status ?? 'todo',
      priority: input.priority ?? 'medium',
      owner: input.owner,
      projectId: input.projectId,
      dueDate: input.dueDate,
      createdAt: now,
      updatedAt: now,
    },
  };
}
