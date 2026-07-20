import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const InvoiceMeta: AtomMeta = {
  id: 21,
  symbol: 'In',
  name: 'Invoice',
  family: 'objects',
  description: 'Billing document.',
};

export const InvoiceProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'number', type: 'string', required: true },
  { key: 'customerName', type: 'string', required: true },
  { key: 'customerId', type: 'reference' },
  { key: 'amount', type: 'currency', required: true },
  { key: 'currency', type: 'string' },
  { key: 'status', type: 'enum', enumValues: ['draft', 'sent', 'paid', 'overdue', 'void'], required: true },
  { key: 'issueDate', type: 'date', required: true },
  { key: 'dueDate', type: 'date', required: true },
  { key: 'paidAt', type: 'datetime' },
  { key: 'notes', type: 'string' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Invoice extends ObjectAtom {
  meta: typeof InvoiceMeta;
  properties: {
    id: string;
    number: string;
    customerName: string;
    customerId?: string;
    amount: number;
    currency?: string;
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
    issueDate: string;
    dueDate: string;
    paidAt?: string;
    notes?: string;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createInvoice(input: {
  id: string;
  number: string;
  customerName: string;
  customerId?: string;
  amount: number;
  currency?: string;
  status?: Invoice['properties']['status'];
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  notes?: string;
}): Invoice {
  const now = new Date().toISOString();
  return {
    meta: InvoiceMeta,
    id: input.id,
    properties: {
      id: input.id,
      number: input.number,
      customerName: input.customerName,
      customerId: input.customerId,
      amount: input.amount,
      currency: input.currency ?? 'USD',
      status: input.status ?? 'draft',
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      paidAt: input.paidAt,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    },
  };
}
