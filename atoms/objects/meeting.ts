import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const MeetingMeta: AtomMeta = {
  id: 20,
  symbol: 'Mt',
  name: 'Meeting',
  family: 'objects',
  description: 'Scheduled gathering.',
};

export const MeetingProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'title', type: 'string', required: true },
  { key: 'startsAt', type: 'datetime', required: true },
  { key: 'endsAt', type: 'datetime' },
  { key: 'organizerId', type: 'reference', description: 'User id' },
  { key: 'attendeeIds', type: 'json', description: 'Array of User ids' },
  { key: 'location', type: 'string' },
  { key: 'conferenceUrl', type: 'string' },
  { key: 'agenda', type: 'string' },
  { key: 'status', type: 'enum', enumValues: ['scheduled', 'in_progress', 'completed', 'cancelled'], required: true },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Meeting extends ObjectAtom {
  meta: typeof MeetingMeta;
  properties: {
    id: string;
    title: string;
    startsAt: string;
    endsAt?: string;
    organizerId?: string;
    attendeeIds?: string[];
    location?: string;
    conferenceUrl?: string;
    agenda?: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    createdAt: string;
    updatedAt?: string;
  };
}

export function createMeeting(input: {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  organizerId?: string;
  attendeeIds?: string[];
  location?: string;
  conferenceUrl?: string;
  agenda?: string;
}): Meeting {
  const now = new Date().toISOString();
  return {
    meta: MeetingMeta,
    id: input.id,
    properties: {
      id: input.id,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      organizerId: input.organizerId,
      attendeeIds: input.attendeeIds,
      location: input.location,
      conferenceUrl: input.conferenceUrl,
      agenda: input.agenda,
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
    },
  };
}
