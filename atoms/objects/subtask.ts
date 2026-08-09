import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const SubtaskMeta: AtomMeta = {
  id: 15,
  symbol: 'St',
  name: 'Subtask',
  family: 'objects',
  description: 'Child unit of work under a Task.',
};

export const SubtaskProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'title', type: 'string', required: true },
  { key: 'parentTaskId', type: 'reference', description: 'Reference to Task', required: true },
  { key: 'status', type: 'enum', enumValues: ['todo', 'in_progress', 'done'], required: true },
  { key: 'assignee', type: 'reference', description: 'User id' },
  { key: 'dueDate', type: 'date' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Subtask extends ObjectAtom {
  meta: typeof SubtaskMeta;
  properties: {
    id: string;
    title: string;
    parentTaskId: string;
    status: 'todo' | 'in_progress' | 'done';
    assignee?: string;
    dueDate?: string;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createSubtask(input: {
  id: string;
  title: string;
  parentTaskId: string;
  assignee?: string;
  dueDate?: string;
}): Subtask {
  const now = new Date().toISOString();
  return {
    meta: SubtaskMeta,
    id: input.id,
    properties: {
      id: input.id,
      title: input.title,
      parentTaskId: input.parentTaskId,
      status: 'todo',
      assignee: input.assignee,
      dueDate: input.dueDate,
      createdAt: now,
      updatedAt: now,
    },
  };
}
