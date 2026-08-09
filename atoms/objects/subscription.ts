import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const SubscriptionMeta: AtomMeta = {
  id: 23,
  symbol: 'Su',
  name: 'Subscription',
  family: 'objects',
  description: 'Recurring entitlement.',
};

export const SubscriptionProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'customerId', type: 'reference', description: 'Reference to Account or Contact', required: true },
  { key: 'planId', type: 'reference', description: 'Reference to Plan', required: true },
  {
    key: 'status',
    type: 'enum',
    enumValues: ['active', 'trialing', 'past_due', 'cancelled', 'expired'],
    required: true,
  },
  { key: 'billingInterval', type: 'enum', enumValues: ['monthly', 'quarterly', 'yearly'], required: true },
  { key: 'startDate', type: 'date', required: true },
  { key: 'renewalDate', type: 'date' },
  { key: 'cancelAt', type: 'datetime' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Subscription extends ObjectAtom {
  meta: typeof SubscriptionMeta;
  properties: {
    id: string;
    customerId: string;
    planId: string;
    status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired';
    billingInterval: 'monthly' | 'quarterly' | 'yearly';
    startDate: string;
    renewalDate?: string;
    cancelAt?: string;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createSubscription(input: {
  id: string;
  customerId: string;
  planId: string;
  billingInterval?: Subscription['properties']['billingInterval'];
  startDate?: string;
  renewalDate?: string;
}): Subscription {
  const now = new Date().toISOString();
  return {
    meta: SubscriptionMeta,
    id: input.id,
    properties: {
      id: input.id,
      customerId: input.customerId,
      planId: input.planId,
      status: 'active',
      billingInterval: input.billingInterval ?? 'monthly',
      startDate: input.startDate ?? now.slice(0, 10),
      renewalDate: input.renewalDate,
      createdAt: now,
      updatedAt: now,
    },
  };
}
