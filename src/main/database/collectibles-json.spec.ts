import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Task 1 tests: validate the generated collectibles.json
// process.cwd() is the project root when vitest is run from isaac-item-tracker/
const DB_PATH = path.join(process.cwd(), 'resources', 'data', 'collectibles.json');

const VALID_VERSIONS = ['rebirth', 'afterbirth', 'afterbirth+', 'repentance', 'repentance+'] as const;
type GameVersion = typeof VALID_VERSIONS[number];

interface CollectibleEntry {
  name: string;
  description: string;
  iconPath: string;
  introducedIn: GameVersion;
  quality?: number;
}

describe('collectibles.json', () => {
  let db: Record<string, CollectibleEntry>;

  beforeEach(() => {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    db = JSON.parse(raw) as Record<string, CollectibleEntry>;
  });

  it('Test 1: every item has required fields with correct types', () => {
    for (const [key, item] of Object.entries(db)) {
      expect(typeof item.name, `item ${key} name`).toBe('string');
      expect(item.name.length, `item ${key} name length`).toBeGreaterThan(0);
      expect(typeof item.description, `item ${key} description`).toBe('string');
      expect(typeof item.iconPath, `item ${key} iconPath`).toBe('string');
      expect(VALID_VERSIONS as readonly string[], `item ${key} introducedIn`).toContain(item.introducedIn);
    }
  });

  it('Test 2: gap IDs 43, 61, 235, 587, 613, 620, 630, 662, 666, 718 are absent', () => {
    const gapIds = [43, 61, 235, 587, 613, 620, 630, 662, 666, 718];
    for (const id of gapIds) {
      expect(String(id) in db, `gap ID ${id} should not exist`).toBe(false);
    }
  });

  it('Test 3: specific items have correct introducedIn versions', () => {
    expect(db['1'].introducedIn).toBe('rebirth');
    expect(db['351'].introducedIn).toBe('afterbirth');
    expect(db['442'].introducedIn).toBe('afterbirth+');
    expect(db['549'].introducedIn).toBe('repentance');
  });

  it('Test 4: total key count is between 700 and 735', () => {
    const count = Object.keys(db).length;
    expect(count).toBeGreaterThanOrEqual(700);
    expect(count).toBeLessThanOrEqual(735);
  });

  it('Test 5: iconPath for item 1 equals collectibles/collectibles_001.png', () => {
    expect(db['1'].iconPath).toBe('collectibles/collectibles_001.png');
  });
});
