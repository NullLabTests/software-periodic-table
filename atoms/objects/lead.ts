import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const LeadMeta: AtomMeta = {
  id: 4,
  symbol: 'Ld',
  name: 'Lead',
  family: 'objects',
  description: 'Potential customer or opportunity source.',
};

export const LeadProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'name', type: 'string', required: true },
  { key: 'email', type: 'string', required: true },
  { key: 'phone', type: 'string' },
  { key: 'company', type: 'string' },
  { key: 'source', type: 'enum', enumValues: ['web', 'referral', 'event', 'cold_outreach', 'other'], required: true },
  { key: 'status', type: 'enum', enumValues: ['new', 'contacted', 'qualified', 'converted', 'lost'], required: true },
  { key: 'owner', type: 'reference', description: 'User id' },
  { key: 'score', type: 'number' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Lead extends ObjectAtom {
  meta: typeof LeadMeta;
  properties: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    source: 'web' | 'referral' | 'event' | 'cold_outreach' | 'other';
    status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
    owner?: string;
    score?: number;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createLead(input: {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source?: Lead['properties']['source'];
  owner?: string;
  score?: number;
}): Lead {
  const now = new Date().toISOString();
  return {
    meta: LeadMeta,
    id: input.id,
    properties: {
      id: input.id,
      name: input.name,
      email: input.email,
      phone: input.phone,
      company: input.company,
      source: input.source ?? 'web',
      status: 'new',
      owner: input.owner,
      score: input.score,
      createdAt: now,
      updatedAt: now,
    },
  };
}
