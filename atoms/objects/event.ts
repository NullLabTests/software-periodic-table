import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const EventMeta: AtomMeta = {
  id: 19,
  symbol: 'Ev',
  name: 'Event',
  family: 'objects',
  description: 'Point-in-time occurrence.',
};

export const EventProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'title', type: 'string', required: true },
  { key: 'startsAt', type: 'datetime', required: true },
  { key: 'endsAt', type: 'datetime' },
  {
    key: 'type',
    type: 'enum',
    enumValues: ['appointment', 'reminder', 'deadline', 'recurrence', 'other'],
    required: true,
  },
  { key: 'calendarId', type: 'reference' },
  { key: 'attendeeIds', type: 'json', description: 'Array of User ids' },
  { key: 'location', type: 'string' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Event extends ObjectAtom {
  meta: typeof EventMeta;
  properties: {
    id: string;
    title: string;
    startsAt: string;
    endsAt?: string;
    type: 'appointment' | 'reminder' | 'deadline' | 'recurrence' | 'other';
    calendarId?: string;
    attendeeIds?: string[];
    location?: string;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createEvent(input: {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  type?: Event['properties']['type'];
  calendarId?: string;
  attendeeIds?: string[];
  location?: string;
}): Event {
  const now = new Date().toISOString();
  return {
    meta: EventMeta,
    id: input.id,
    properties: {
      id: input.id,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      type: input.type ?? 'appointment',
      calendarId: input.calendarId,
      attendeeIds: input.attendeeIds,
      location: input.location,
      createdAt: now,
      updatedAt: now,
    },
  };
}
