import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const PaymentMeta: AtomMeta = {
  id: 22,
  symbol: 'Pm',
  name: 'Payment',
  family: 'objects',
  description: 'Transfer of funds.',
};

export const PaymentProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'amount', type: 'currency', required: true },
  { key: 'currency', type: 'string' },
  { key: 'method', type: 'enum', enumValues: ['card', 'bank_transfer', 'cash', 'check', 'other'], required: true },
  {
    key: 'status',
    type: 'enum',
    enumValues: ['pending', 'authorized', 'captured', 'refunded', 'failed'],
    required: true,
  },
  { key: 'invoiceId', type: 'reference', description: 'Reference to Invoice' },
  { key: 'customerId', type: 'reference', description: 'Reference to Account or Contact' },
  { key: 'receivedAt', type: 'datetime' },
  { key: 'reference', type: 'string' },
  { key: 'createdAt', type: 'datetime', required: true },
];

export interface Payment extends ObjectAtom {
  meta: typeof PaymentMeta;
  properties: {
    id: string;
    amount: number;
    currency?: string;
    method: 'card' | 'bank_transfer' | 'cash' | 'check' | 'other';
    status: 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed';
    invoiceId?: string;
    customerId?: string;
    receivedAt?: string;
    reference?: string;
    createdAt: string;
  };
}

export function createPayment(input: {
  id: string;
  amount: number;
  currency?: string;
  method?: Payment['properties']['method'];
  invoiceId?: string;
  customerId?: string;
  receivedAt?: string;
  reference?: string;
}): Payment {
  return {
    meta: PaymentMeta,
    id: input.id,
    properties: {
      id: input.id,
      amount: input.amount,
      currency: input.currency,
      method: input.method ?? 'card',
      status: 'pending',
      invoiceId: input.invoiceId,
      customerId: input.customerId,
      receivedAt: input.receivedAt,
      reference: input.reference,
      createdAt: new Date().toISOString(),
    },
  };
}
