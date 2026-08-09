import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const LocationMeta: AtomMeta = {
  id: 34,
  symbol: 'Lc',
  name: 'Location',
  family: 'objects',
  description: 'Geographic or logical place.',
};

export const LocationProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'name', type: 'string', required: true },
  { key: 'address', type: 'string' },
  { key: 'latitude', type: 'number' },
  { key: 'longitude', type: 'number' },
  { key: 'city', type: 'string' },
  { key: 'country', type: 'string' },
  { key: 'timezone', type: 'string' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Location extends ObjectAtom {
  meta: typeof LocationMeta;
  properties: {
    id: string;
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    country?: string;
    timezone?: string;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createLocation(input: {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  timezone?: string;
}): Location {
  const now = new Date().toISOString();
  return {
    meta: LocationMeta,
    id: input.id,
    properties: {
      id: input.id,
      name: input.name,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      city: input.city,
      country: input.country,
      timezone: input.timezone,
      createdAt: now,
      updatedAt: now,
    },
  };
}
