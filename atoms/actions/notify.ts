import type { ActionRequest, AtomMeta } from '../core.js';

export const NotifyMeta: AtomMeta = {
  id: 73,
  symbol: 'No',
  name: 'Notify',
  family: 'actions',
  description: 'Send a notification.',
};

export const MessageMeta: AtomMeta = {
  id: 75,
  symbol: 'Mg',
  name: 'Message',
  family: 'actions',
  description: 'Send a message.',
};

export const AssignMeta: AtomMeta = {
  id: 63,
  symbol: 'As',
  name: 'Assign',
  family: 'actions',
  description: 'Associate an object with an owner or target.',
};

export function notifyAction(
  targetType: string,
  targetId: string,
  message: string,
  channel?: 'email' | 'in_app' | 'push',
  actorId?: string,
): ActionRequest {
  return {
    action: 'Notify',
    targetType,
    targetId,
    payload: { message, channel },
    actorId,
  };
}

export function assignAction(
  targetType: string,
  targetId: string,
  assigneeId: string,
  actorId?: string,
): ActionRequest {
  return {
    action: 'Assign',
    targetType,
    targetId,
    payload: { assigneeId },
    actorId,
  };
}
