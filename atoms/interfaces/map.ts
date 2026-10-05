import type { AtomMeta, InterfaceSpec } from '../core.js';

export const MapMeta: AtomMeta = {
  id: 91,
  symbol: 'Mp',
  name: 'Map',
  family: 'interfaces',
  description: 'Geographic visualization.',
};

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  /** Groups markers that share a value, e.g. status. */
  category?: string;
}

export interface MapSpec extends InterfaceSpec {
  kind: 'Map';
  latKey: string;
  lngKey: string;
  labelKey?: string;
  categoryKey?: string;
  zoom?: number;
  cluster?: boolean;
}

export function defineMap(opts: {
  objectType: string;
  latKey: string;
  lngKey: string;
  labelKey?: string;
  categoryKey?: string;
  zoom?: number;
  cluster?: boolean;
}): MapSpec {
  return {
    kind: 'Map',
    objectType: opts.objectType,
    latKey: opts.latKey,
    lngKey: opts.lngKey,
    labelKey: opts.labelKey ?? 'name',
    categoryKey: opts.categoryKey,
    zoom: opts.zoom ?? 10,
    cluster: opts.cluster ?? false,
    actions: ['View', 'Filter'],
  };
}

export interface MapMarkerResult {
  markers: MapMarker[];
  unplaceable: { record: Record<string, unknown>; reason: string }[];
}

/**
 * Project records onto coordinates.
 *
 * Records without usable coordinates are returned in `unplaceable` rather than
 * dropped or pinned at (0, 0): a marker in the Gulf of Guinea is a wrong answer
 * that looks right, and a silently shorter list hides missing data. Latitude
 * outside ±90 and longitude outside ±180 are treated as unplaceable for the
 * same reason.
 */
export function materializeMap(spec: MapSpec, records: Record<string, unknown>[]): MapMarkerResult {
  const markers: MapMarker[] = [];
  const unplaceable: { record: Record<string, unknown>; reason: string }[] = [];

  for (const record of records) {
    const lat = toNumber(record[spec.latKey]);
    const lng = toNumber(record[spec.lngKey]);

    if (lat === null || lng === null) {
      unplaceable.push({
        record,
        reason: `${spec.latKey}/${spec.lngKey} must both be numbers, got ${JSON.stringify(record[spec.latKey])}/${JSON.stringify(record[spec.lngKey])}`,
      });
      continue;
    }
    if (lat < -90 || lat > 90) {
      unplaceable.push({ record, reason: `latitude ${lat} is outside -90..90` });
      continue;
    }
    if (lng < -180 || lng > 180) {
      unplaceable.push({ record, reason: `longitude ${lng} is outside -180..180` });
      continue;
    }

    markers.push({
      id: String(record.id ?? ''),
      lat,
      lng,
      label: spec.labelKey ? text(record[spec.labelKey]) : undefined,
      category: spec.categoryKey ? text(record[spec.categoryKey]) || undefined : undefined,
    });
  }

  return { markers, unplaceable };
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}
