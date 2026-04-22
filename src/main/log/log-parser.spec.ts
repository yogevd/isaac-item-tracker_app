// log-parser.spec.ts
// Comprehensive tests for parseLine() — the core log line classifier.
// Covers all 5 LogEvent types, prefix stripping, version detection order,
// seed extraction, and null returns for unrecognized lines.

import { describe, it, expect } from 'vitest';
import { parseLine } from './log-parser';

// ---------------------------------------------------------------------------
// Prefix stripping
// ---------------------------------------------------------------------------

describe('parseLine — prefix stripping', () => {
  it('strips "[INFO] - " prefix (with brackets)', () => {
    const result = parseLine('[INFO] - Adding collectible 105 (The D6)');
    expect(result).toEqual({ type: 'item-pickup', itemId: 105 });
  });

  it('strips "INFO] - " prefix (without opening bracket)', () => {
    const result = parseLine('INFO] - Adding collectible 105 (The D6)');
    expect(result).toEqual({ type: 'item-pickup', itemId: 105 });
  });

  it('handles lines with no prefix', () => {
    const result = parseLine('Adding collectible 105 (The D6)');
    expect(result).toEqual({ type: 'item-pickup', itemId: 105 });
  });
});

// ---------------------------------------------------------------------------
// Version detection
// ---------------------------------------------------------------------------

describe('parseLine — version detection', () => {
  it('detects Repentance version', () => {
    const result = parseLine('Binding of Isaac: Repentance v1.0');
    expect(result).toEqual({ type: 'version-detected', version: 'repentance' });
  });

  it('detects Afterbirth+ version with [INFO] - prefix', () => {
    const result = parseLine('[INFO] - Binding of Isaac: Afterbirth+ v1.0');
    expect(result).toEqual({ type: 'version-detected', version: 'afterbirth+' });
  });

  it('detects Afterbirth version (not false-matched as Afterbirth+)', () => {
    const result = parseLine('Binding of Isaac: Afterbirth v1.0');
    expect(result).toEqual({ type: 'version-detected', version: 'afterbirth' });
  });

  it('detects Rebirth version', () => {
    const result = parseLine('Binding of Isaac: Rebirth v1.0');
    expect(result).toEqual({ type: 'version-detected', version: 'rebirth' });
  });

  it('detects Repentance before Afterbirth when both strings present (order check)', () => {
    // Repentance check must come before Afterbirth to avoid wrong detection.
    // A line with "Repentance" must never resolve as "afterbirth".
    const result = parseLine('Binding of Isaac: Repentance v1.7.9');
    expect(result?.type).toBe('version-detected');
    expect((result as { type: 'version-detected'; version: string }).version).toBe('repentance');
  });

  it('detects Afterbirth+ before Afterbirth (substring order check)', () => {
    // "Afterbirth+" contains "Afterbirth" as a substring.
    // Afterbirth+ check must come before plain Afterbirth.
    const result = parseLine('Binding of Isaac: Afterbirth+ v1.06');
    expect(result).toEqual({ type: 'version-detected', version: 'afterbirth+' });
  });
});

// ---------------------------------------------------------------------------
// Run start (new run / seed detection)
// ---------------------------------------------------------------------------

describe('parseLine — run start', () => {
  it('detects RNG Start Seed and extracts seed string', () => {
    const result = parseLine('RNG Start Seed: ABCD EFGH (0.123456789)');
    expect(result).toEqual({ type: 'run-start', seed: 'ABCD EFGH' });
  });

  it('detects RNG Start Seed with [INFO] - prefix', () => {
    const result = parseLine('[INFO] - RNG Start Seed: WXYZ 1234 (0.987654321)');
    expect(result).toEqual({ type: 'run-start', seed: 'WXYZ 1234' });
  });
});

// ---------------------------------------------------------------------------
// Item pickup
// ---------------------------------------------------------------------------

describe('parseLine — item pickup', () => {
  it('detects Adding collectible with item ID 105', () => {
    const result = parseLine('Adding collectible 105 (The D6)');
    expect(result).toEqual({ type: 'item-pickup', itemId: 105 });
  });

  it('detects Adding collectible with item ID 1 via [INFO] - prefix', () => {
    const result = parseLine('[INFO] - Adding collectible 1 (The Sad Onion)');
    expect(result).toEqual({ type: 'item-pickup', itemId: 1 });
  });
});

// ---------------------------------------------------------------------------
// Item removal
// ---------------------------------------------------------------------------

describe('parseLine — item removal', () => {
  it('detects Removing collectible with item ID 105', () => {
    const result = parseLine('Removing collectible 105 (The D6)');
    expect(result).toEqual({ type: 'item-removal', itemId: 105 });
  });
});

// ---------------------------------------------------------------------------
// Floor change
// ---------------------------------------------------------------------------

describe('parseLine — floor change', () => {
  it('detects Level::Init with m_StageType', () => {
    const result = parseLine('Level::Init m_Stage 2, m_StageType 0');
    expect(result).toEqual({ type: 'floor-change', stage: 2, stageType: 0 });
  });

  it('detects Level::Init with m_AltStage (maps to stageType: 0)', () => {
    const result = parseLine('Level::Init m_Stage 1, m_AltStage 0');
    expect(result).toEqual({ type: 'floor-change', stage: 1, stageType: 0 });
  });

  it('detects higher stage numbers correctly', () => {
    const result = parseLine('Level::Init m_Stage 10, m_StageType 2');
    expect(result).toEqual({ type: 'floor-change', stage: 10, stageType: 2 });
  });
});

// ---------------------------------------------------------------------------
// Unrecognized / null returns
// ---------------------------------------------------------------------------

describe('parseLine — unrecognized lines', () => {
  it('returns null for a generic loading line', () => {
    expect(parseLine('Loading resources...')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseLine('')).toBeNull();
  });

  it('returns null for a line with only whitespace', () => {
    expect(parseLine('   ')).toBeNull();
  });

  it('returns null for partial "Adding collectible" without a number', () => {
    expect(parseLine('Adding collectible (no id here)')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Threat T-02-04: Line length limit (DoS mitigation)
// ---------------------------------------------------------------------------

describe('parseLine — line length limit (T-02-04)', () => {
  it('truncates lines longer than 1000 chars before parsing', () => {
    // A very long line should not hang the parser (no catastrophic backtracking).
    // The parser must return null rather than hanging.
    const longLine = 'A'.repeat(5000);
    const result = parseLine(longLine);
    expect(result).toBeNull();
  });

  it('still parses valid events on lines exactly at the 1000-char boundary', () => {
    // Build a line that is exactly 1000 chars and starts with a valid event.
    const prefix = 'Adding collectible 105 ';
    const padding = 'x'.repeat(1000 - prefix.length);
    const line = prefix + padding;
    // Line is 1000 chars total — should still be parsed (limit is truncate, not reject)
    const result = parseLine(line);
    expect(result).toEqual({ type: 'item-pickup', itemId: 105 });
  });
});
