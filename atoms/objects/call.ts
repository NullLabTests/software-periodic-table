import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const CallMeta: AtomMeta = {
  id: 29,
  symbol: 'Cl',
  name: 'Call',
  family: 'objects',
  description: 'Voice or video call record.',
};

export const CallProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'participantIds', type: 'json', description: 'Array of User ids' },
  { key: 'direction', type: 'enum', enumValues: ['inbound', 'outbound'], required: true },
  { key: 'kind', type: 'enum', enumValues: ['voice', 'video'], required: true },
  { key: 'startedAt', type: 'datetime', required: true },
  { key: 'endedAt', type: 'datetime' },
  { key: 'durationSeconds', type: 'number' },
  { key: 'recordingUrl', type: 'string' },
  { key: 'summary', type: 'string' },
  { key: 'createdAt', type: 'datetime', required: true },
];

export interface Call extends ObjectAtom {
  meta: typeof CallMeta;
  properties: {
    id: string;
    participantIds?: string[];
    direction: 'inbound' | 'outbound';
    kind: 'voice' | 'video';
    startedAt: string;
    endedAt?: string;
    durationSeconds?: number;
    recordingUrl?: string;
    summary?: string;
    createdAt: string;
  };
}

export function createCall(input: {
  id: string;
  participantIds?: string[];
  direction?: Call['properties']['direction'];
  kind?: Call['properties']['kind'];
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  recordingUrl?: string;
  summary?: string;
}): Call {
  const now = new Date().toISOString();
  return {
    meta: CallMeta,
    id: input.id,
    properties: {
      id: input.id,
      participantIds: input.participantIds,
      direction: input.direction ?? 'outbound',
      kind: input.kind ?? 'voice',
      startedAt: input.startedAt ?? now,
      endedAt: input.endedAt,
      durationSeconds: input.durationSeconds,
      recordingUrl: input.recordingUrl,
      summary: input.summary,
      createdAt: now,
    },
  };
}
