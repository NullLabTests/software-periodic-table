import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const CampaignMeta: AtomMeta = {
  id: 26,
  symbol: 'Cp',
  name: 'Campaign',
  family: 'objects',
  description: 'Marketing or outreach campaign.',
};

export const CampaignProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'name', type: 'string', required: true },
  { key: 'description', type: 'string' },
  { key: 'type', type: 'enum', enumValues: ['email', 'social', 'event', 'ads', 'other'], required: true },
  { key: 'status', type: 'enum', enumValues: ['draft', 'active', 'paused', 'completed', 'cancelled'], required: true },
  { key: 'owner', type: 'reference', description: 'User id' },
  { key: 'budget', type: 'currency' },
  { key: 'startsAt', type: 'datetime' },
  { key: 'endsAt', type: 'datetime' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Campaign extends ObjectAtom {
  meta: typeof CampaignMeta;
  properties: {
    id: string;
    name: string;
    description?: string;
    type: 'email' | 'social' | 'event' | 'ads' | 'other';
    status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
    owner?: string;
    budget?: number;
    startsAt?: string;
    endsAt?: string;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createCampaign(input: {
  id: string;
  name: string;
  description?: string;
  type?: Campaign['properties']['type'];
  owner?: string;
  budget?: number;
  startsAt?: string;
  endsAt?: string;
}): Campaign {
  const now = new Date().toISOString();
  return {
    meta: CampaignMeta,
    id: input.id,
    properties: {
      id: input.id,
      name: input.name,
      description: input.description,
      type: input.type ?? 'email',
      status: 'draft',
      owner: input.owner,
      budget: input.budget,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      createdAt: now,
      updatedAt: now,
    },
  };
}
