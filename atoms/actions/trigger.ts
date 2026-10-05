import type { ActionRequest, AtomMeta } from '../core.js';

export const TriggerMeta: AtomMeta = {
  id: 81,
  symbol: 'Tr',
  name: 'Trigger',
  family: 'actions',
  description: 'Fire automation in response to an event.',
};

/** An event a trigger can bind to. Kept open so hosts can extend the set. */
export interface TriggerEvent {
  /** Dotted event name, e.g. `task.status_changed`. */
  name: string;
  objectType?: string;
  objectId?: string;
  /** Field values at the time the event fired, for condition evaluation. */
  data?: Record<string, unknown>;
  /** Previous value of the changed field, where the host tracks one. */
  previous?: Record<string, unknown>;
  actorId?: string;
  occurredAt?: string;
}

/**
 * Build the action that dispatches a set of effects for a fired event.
 *
 * The Trigger action atom is what a rule binds to; the rule family owns the
 * condition and audit atoms. Keeping the request declarative means the host
 * decides how automation actually runs, which is the point of the action
 * family.
 */
export function triggerAction(
  event: TriggerEvent,
  effects: { action: string; targetType?: string; targetId?: string; payload?: Record<string, unknown> }[],
  actorId?: string,
): ActionRequest {
  return {
    action: 'Trigger',
    targetType: event.objectType,
    targetId: event.objectId,
    payload: { event: event.name, data: event.data, previous: event.previous, effects },
    actorId: actorId ?? event.actorId,
  };
}

/** True when a trigger should consider `event`, i.e. the object type matches. */
export function triggerMatches(event: TriggerEvent, binding: { event: string; objectType?: string }): boolean {
  if (binding.event !== event.name) return false;
  if (binding.objectType && event.objectType && binding.objectType !== event.objectType) return false;
  return true;
}
