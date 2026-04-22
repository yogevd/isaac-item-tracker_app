// log-parser.ts
// Pure function that classifies a single raw log line into a typed LogEvent.
// No state, no side effects — safe to call for every line during log watching.

import type { LogEvent } from '../../shared/types';

/** Maximum line length processed before truncation (DoS mitigation T-02-04). */
const MAX_LINE_LENGTH = 1000;

/**
 * Strip the Binding of Isaac log prefix from a raw line.
 *
 * The log file prefixes vary:
 *   "[INFO] - <content>"  — Repentance / most versions
 *   "INFO] - <content>"   — observed in some older builds
 *   "<content>"           — no prefix (common for many lines)
 */
function stripPrefix(raw: string): string {
  if (raw.startsWith('[INFO] - ')) return raw.slice(9);
  if (raw.startsWith('INFO] - ')) return raw.slice(8);
  return raw;
}

/**
 * Parse a single raw log line and return the corresponding LogEvent, or null
 * if the line does not match any known pattern.
 *
 * @param raw - A single line from the Isaac log.txt file (may include prefix).
 * @returns A typed LogEvent or null for unrecognized lines.
 */
export function parseLine(raw: string): LogEvent | null {
  // T-02-04: Limit line length to prevent catastrophic regex backtracking.
  const safeRaw = raw.length > MAX_LINE_LENGTH ? raw.slice(0, MAX_LINE_LENGTH) : raw;

  const line = stripPrefix(safeRaw);

  // ---- Version detection --------------------------------------------------
  // Order is critical: Repentance must be checked before Afterbirth (no substring
  // overlap), and Afterbirth+ must be checked before plain Afterbirth (because
  // "Afterbirth+" contains the substring "Afterbirth").

  if (line.includes('Binding of Isaac: Repentance')) {
    return { type: 'version-detected', version: 'repentance' };
  }
  if (line.includes('Binding of Isaac: Afterbirth+')) {
    return { type: 'version-detected', version: 'afterbirth+' };
  }
  if (line.includes('Binding of Isaac: Afterbirth')) {
    return { type: 'version-detected', version: 'afterbirth' };
  }
  if (line.includes('Binding of Isaac: Rebirth')) {
    return { type: 'version-detected', version: 'rebirth' };
  }

  // ---- New run (RNG seed) -------------------------------------------------
  // Format: "RNG Start Seed: AAAA BBBB (0.123456789)"
  // Seed occupies positions 16..24 (9 chars: 4+space+4).
  if (line.startsWith('RNG Start Seed: ')) {
    const seed = line.slice(16, 25).trim();
    return { type: 'run-start', seed };
  }

  // ---- Item pickup --------------------------------------------------------
  // Format: "Adding collectible <id> (<name>)"
  if (line.startsWith('Adding collectible ')) {
    const parts = line.split(' ');
    const itemId = parseInt(parts[2], 10);
    if (!isNaN(itemId)) {
      return { type: 'item-pickup', itemId };
    }
    return null;
  }

  // ---- Item removal -------------------------------------------------------
  // Format: "Removing collectible <id> (<name>)"
  if (line.startsWith('Removing collectible ')) {
    const parts = line.split(' ');
    const itemId = parseInt(parts[2], 10);
    if (!isNaN(itemId)) {
      return { type: 'item-removal', itemId };
    }
    return null;
  }

  // ---- Floor change -------------------------------------------------------
  // Format: "Level::Init m_Stage <N>, m_StageType <N>"
  //      or "Level::Init m_Stage <N>, m_AltStage <N>"
  // Use non-greedy regex with explicit character classes to avoid backtracking.
  const floorMatch = /Level::Init m_Stage (\d+), m_(?:StageType|AltStage) (\d+)/.exec(line);
  if (floorMatch) {
    const stage = parseInt(floorMatch[1], 10);
    const stageType = parseInt(floorMatch[2], 10);
    return { type: 'floor-change', stage, stageType };
  }

  return null;
}
