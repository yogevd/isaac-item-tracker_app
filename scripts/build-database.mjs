#!/usr/bin/env node
/**
 * build-database.mjs
 *
 * Downloads the three RebirthItemTracker JSON files from GitHub and merges them
 * into a single collectibles.json keyed by numeric item ID.
 *
 * Merge strategy:
 *   1. items.json       — Rebirth base items (authoritative for IDs 1-346)
 *   2. items_abplus.json — Afterbirth/Afterbirth+ items (authoritative for IDs 347-534)
 *   3. items_rep.json   — Repentance/Repentance+ items (only NEW IDs 535-732 are taken)
 *
 * This ensures each item retains the version tag from the file that first introduced it,
 * rather than being overwritten by a later file that lists it with a different tag.
 *
 * Usage: node scripts/build-database.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

// Source URLs from Rchardon/RebirthItemTracker
const SOURCES = [
  {
    url: 'https://raw.githubusercontent.com/Rchardon/RebirthItemTracker/master/items.json',
    defaultVersion: 'rebirth',
    label: 'items.json (Rebirth base)',
    // Only process IDs in this range (inclusive). null = no upper bound.
    idRange: [1, 346],
  },
  {
    url: 'https://raw.githubusercontent.com/Rchardon/RebirthItemTracker/master/items_abplus.json',
    defaultVersion: 'afterbirth+',
    label: 'items_abplus.json (Afterbirth / Afterbirth+)',
    idRange: [347, 534],
  },
  {
    url: 'https://raw.githubusercontent.com/Rchardon/RebirthItemTracker/master/items_rep.json',
    defaultVersion: 'repentance',
    label: 'items_rep.json (Repentance / Repentance+)',
    idRange: [535, 732],
  },
];

/**
 * Normalize a raw introduced_in value to the canonical GameVersion string.
 * Falls back to defaultVersion when the field is missing, null, or unrecognized.
 *
 * Special mappings based on observed source data:
 *   - "Booster Pack #1-5": AB+ free DLC packs → "afterbirth+"
 *   - "Antibirth": fan mod incorporated into Repentance → "repentance"
 *   - "Unknown": treated as defaultVersion
 */
function normalizeVersion(raw, defaultVersion) {
  if (!raw) return defaultVersion;

  const lower = raw.toLowerCase().trim();

  if (lower === 'rebirth') return 'rebirth';
  if (lower === 'afterbirth') return 'afterbirth';
  if (lower === 'afterbirth+' || lower === 'afterbirth +') return 'afterbirth+';
  if (lower === 'repentance') return 'repentance';
  if (lower === 'repentance+') return 'repentance+';

  // Booster Packs #1-5 are free Afterbirth+ DLC content (for IDs in the AB+ range).
  // However items in the Repentance ID range (535+) that are tagged "Booster Pack" in
  // items_rep.json were only made accessible in Repentance — use defaultVersion there.
  if (lower.startsWith('booster pack')) return defaultVersion;

  // Antibirth mod items were incorporated into Repentance
  if (lower === 'antibirth') return 'repentance';

  // "Unknown" or anything else — fall back to the source's default
  return defaultVersion;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return res.json();
}

async function main() {
  console.log('Building collectibles.json from RebirthItemTracker data...\n');

  const merged = {};
  const versionCounts = {
    rebirth: 0,
    afterbirth: 0,
    'afterbirth+': 0,
    repentance: 0,
    'repentance+': 0,
  };
  const skippedIds = [];
  const rawVersionsSeen = new Set();

  for (const source of SOURCES) {
    console.log(`Fetching ${source.label}...`);
    const data = await fetchJson(source.url);
    const [minId, maxId] = source.idRange;

    // Collect all raw introduced_in values before transforming (resolves Open Question #1)
    for (const item of Object.values(data)) {
      rawVersionsSeen.add(item.introduced_in ?? '(null/undefined)');
    }

    for (const [idStr, item] of Object.entries(data)) {
      const id = Number(idStr);

      // Skip non-numeric and out-of-range IDs for this source
      if (isNaN(id) || id < minId || id > maxId) {
        continue; // out of this source's responsibility range — not an error
      }

      // Skip gap IDs: items with no name or empty name
      const name = (item.name || '').trim();
      if (!name) {
        skippedIds.push(`${idStr}(no-name)`);
        continue;
      }

      // Normalize introduced_in using source defaultVersion as fallback
      const introducedIn = normalizeVersion(item.introduced_in, source.defaultVersion);

      // Build iconPath with 3-digit zero-padded ID
      const iconPath = `collectibles/collectibles_${String(id).padStart(3, '0')}.png`;

      // Use item.text as description (RebirthItemTracker field), fall back to item.description
      const description = (item.text || item.description || '').trim();

      // Build the entry (quality is optional)
      const entry = {
        name,
        description,
        iconPath,
        introducedIn,
      };

      if (typeof item.quality === 'number') {
        entry.quality = item.quality;
      }

      merged[String(id)] = entry;
      versionCounts[introducedIn]++;
    }
  }

  console.log('\n--- Raw introduced_in values seen across all sources ---');
  for (const v of [...rawVersionsSeen].sort()) {
    console.log(`  "${v}"`);
  }

  // Write output
  const outputDir = path.join(PROJECT_ROOT, 'resources', 'data');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'collectibles.json');
  fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2), 'utf-8');

  const totalItems = Object.keys(merged).length;

  console.log('\n--- Build Summary ---');
  console.log(`Total items written: ${totalItems}`);
  console.log('Count per version:');
  for (const [version, count] of Object.entries(versionCounts)) {
    console.log(`  ${version}: ${count}`);
  }

  if (skippedIds.length > 0) {
    console.log(`\nSkipped IDs (no name): ${skippedIds.join(', ')}`);
  }

  console.log(`\nOutput: ${outputPath}`);
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
