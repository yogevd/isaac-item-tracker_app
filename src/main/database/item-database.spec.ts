import { describe, it, expect } from 'vitest';
import { ItemDatabase } from './item-database';
import type { ItemData } from '../../shared/types';

// Minimal fixture covering all test cases
const fixture: Record<string, Omit<ItemData, 'id'>> = {
  '1': {
    name: 'The Sad Onion',
    description: 'Tears up',
    iconPath: 'collectibles/collectibles_001.png',
    introducedIn: 'rebirth',
    quality: 1,
  },
  '442': {
    name: "Dark Prince's Crown",
    description: 'Range up at 1 heart',
    iconPath: 'collectibles/collectibles_442.png',
    introducedIn: 'afterbirth+',
  },
  '549': {
    name: 'Brittle Bones',
    description: 'Removes all red hearts',
    iconPath: 'collectibles/collectibles_549.png',
    introducedIn: 'repentance',
  },
};

describe('ItemDatabase', () => {
  const db = new ItemDatabase(fixture);

  it('Test 1: lookup(1, rebirth) returns The Sad Onion with introducedIn rebirth', () => {
    const item = db.lookup(1, 'rebirth');
    expect(item).not.toBeNull();
    expect(item?.name).toBe('The Sad Onion');
    expect(item?.introducedIn).toBe('rebirth');
  });

  it('Test 2: lookup(549, rebirth) returns null (Repentance item not in Rebirth)', () => {
    expect(db.lookup(549, 'rebirth')).toBeNull();
  });

  it('Test 3: lookup(549, repentance) returns non-null', () => {
    expect(db.lookup(549, 'repentance')).not.toBeNull();
  });

  it('Test 4: lookup(549, repentance+) returns non-null (repentance+ is a superset)', () => {
    expect(db.lookup(549, 'repentance+')).not.toBeNull();
  });

  it('Test 5: lookup(43, repentance+) returns null (gap ID — not in Map)', () => {
    expect(db.lookup(43, 'repentance+')).toBeNull();
  });

  it('Test 6: lookup(9999, repentance+) returns null (ID out of range)', () => {
    expect(db.lookup(9999, 'repentance+')).toBeNull();
  });

  it('Test 7: size returns the count of valid items loaded', () => {
    expect(db.size).toBe(3);
  });

  it('Test 8: lookup(442, afterbirth) returns null (AB+ item not visible in Afterbirth)', () => {
    expect(db.lookup(442, 'afterbirth')).toBeNull();
  });

  it('Test 9: lookup(442, afterbirth+) returns non-null', () => {
    expect(db.lookup(442, 'afterbirth+')).not.toBeNull();
  });
});
