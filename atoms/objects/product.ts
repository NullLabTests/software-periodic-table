import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const ProductMeta: AtomMeta = {
  id: 11,
  symbol: 'Pr',
  name: 'Product',
  family: 'objects',
  description: 'Sellable or deliverable product.',
};

export const ProductProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'name', type: 'string', required: true },
  { key: 'description', type: 'string' },
  { key: 'price', type: 'currency', required: true },
  { key: 'currency', type: 'string' },
  { key: 'category', type: 'string' },
  { key: 'status', type: 'enum', enumValues: ['active', 'inactive', 'discontinued'], required: true },
  { key: 'imageUrl', type: 'string' },
  { key: 'tags', type: 'json' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Product extends ObjectAtom {
  meta: typeof ProductMeta;
  properties: {
    id: string;
    name: string;
    description?: string;
    price: number;
    currency?: string;
    category?: string;
    status: 'active' | 'inactive' | 'discontinued';
    imageUrl?: string;
    tags?: string[];
    createdAt: string;
    updatedAt?: string;
  };
}

export function createProduct(input: {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  category?: string;
  status?: Product['properties']['status'];
  imageUrl?: string;
  tags?: string[];
}): Product {
  const now = new Date().toISOString();
  return {
    meta: ProductMeta,
    id: input.id,
    properties: {
      id: input.id,
      name: input.name,
      description: input.description,
      price: input.price,
      currency: input.currency ?? 'USD',
      category: input.category,
      status: input.status ?? 'active',
      imageUrl: input.imageUrl,
      tags: input.tags,
      createdAt: now,
      updatedAt: now,
    },
  };
}
