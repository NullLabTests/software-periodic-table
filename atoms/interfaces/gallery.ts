import type { AtomMeta, InterfaceSpec } from '../core.js';

export const GalleryMeta: AtomMeta = {
  id: 90,
  symbol: 'Gy',
  name: 'Gallery',
  family: 'interfaces',
  description: 'Image-first card grid. Ideal for Product-like objects.',
};

export interface GalleryTile {
  id: string;
  title: string;
  /** Key holding the tile's primary image, when the object has one. */
  imageKey?: string;
  subtitleKey?: string;
  badges?: string[];
}

export interface GallerySpec extends InterfaceSpec {
  kind: 'Gallery';
  tiles: GalleryTile[];
  imageKey?: string;
  /** Tiles per row. The host owns the breakpoint, so this is a hint. */
  columnsPerRow?: number;
}

export function defineGallery(opts: {
  objectType: string;
  tiles: GalleryTile[];
  imageKey?: string;
  columnsPerRow?: number;
}): GallerySpec {
  return {
    kind: 'Gallery',
    objectType: opts.objectType,
    tiles: opts.tiles,
    imageKey: opts.imageKey,
    columnsPerRow: opts.columnsPerRow ?? 4,
    actions: ['View', 'Create', 'Update'],
  };
}

/**
 * Project records into gallery tiles, in tile declaration order.
 * Records whose key is missing from the tile list are left out, so a stale
 * tile list cannot silently render an undefined tile.
 */
export function materializeGallery(spec: GallerySpec, items: Record<string, unknown>[]): GalleryTile[] {
  const byId = new Map(items.map((item) => [String(item.id ?? ''), item]));
  const tiles: GalleryTile[] = [];
  for (const tile of spec.tiles) {
    const record = byId.get(tile.id);
    if (!record) continue;
    const image = tile.imageKey ?? spec.imageKey;
    tiles.push({
      ...tile,
      title: String(record[tile.title] ?? ''),
      imageKey: image && record[image] !== undefined ? image : undefined,
    });
  }
  return tiles;
}
