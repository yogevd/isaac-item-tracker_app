import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import type { GameVersion, ItemData } from '../../shared/types';
import { VERSION_HIERARCHY } from '../../shared/types';

export class ItemDatabase {
  private items = new Map<number, ItemData>();

  /**
   * Load the bundled collectibles.json from resources/data/.
   * Uses app.getAppPath() so it works in both dev and packaged builds.
   */
  static load(): ItemDatabase {
    const dbPath = path.join(app.getAppPath(), 'resources', 'data', 'collectibles.json');
    const raw = fs.readFileSync(dbPath, 'utf-8');
    return new ItemDatabase(JSON.parse(raw));
  }

  constructor(data: Record<string, Omit<ItemData, 'id'>>) {
    for (const [key, item] of Object.entries(data)) {
      const id = Number(key);
      if (!isNaN(id) && id > 0) {
        this.items.set(id, { ...item, id });
      }
    }
  }

  /**
   * Look up an item by ID, filtered to items available in the given game version.
   * Returns null for gap IDs, out-of-range IDs, or items introduced in a later version.
   */
  lookup(id: number, version: GameVersion = 'repentance+'): ItemData | null {
    const item = this.items.get(id);
    if (!item) return null;

    const maxIdx = VERSION_HIERARCHY.indexOf(version);
    const itemIdx = VERSION_HIERARCHY.indexOf(item.introducedIn);
    return itemIdx <= maxIdx ? item : null;
  }

  get size(): number {
    return this.items.size;
  }
}
