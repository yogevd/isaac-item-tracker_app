// log-finder.spec.ts
// Unit tests for log path resolution logic.
// Uses findLogPathForPlatform() to avoid mocking os/process modules.

import { describe, it, expect } from 'vitest';
import { findLogPathForPlatform, getLogCandidatePaths } from './log-finder';
import path from 'path';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('findLogPathForPlatform', () => {
  it('Test 1: returns null when no log.txt exists at any candidate path', () => {
    // Mock fs.existsSync: delegate to the implementation but pass non-existent dirs
    // The easiest approach: pass a homedir that definitely doesn't have Isaac installed.
    // Since we are running in CI/dev, /tmp/nonexistent-isaac-home won't have the paths.
    const result = findLogPathForPlatform('win32', '/tmp/nonexistent-isaac-home-abc123');
    expect(result).toBeNull();
  });

  it('Test 2: returns Repentance path on win32 when Repentance log.txt exists', () => {
    // Create a temporary directory structure simulating a Windows Repentance install
    const tmpDir = '/tmp/isaac-test-win-repentance';
    const repPath = path.join(tmpDir, 'Documents', 'My Games', 'Binding of Isaac Repentance', 'log.txt');
    fs.mkdirSync(path.dirname(repPath), { recursive: true });
    fs.writeFileSync(repPath, '');

    try {
      const result = findLogPathForPlatform('win32', tmpDir);
      expect(result).toBe(repPath);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('Test 3: returns Afterbirth+ path when only Afterbirth+ log.txt exists (win32)', () => {
    const tmpDir = '/tmp/isaac-test-win-abplus';
    const abPlusPath = path.join(tmpDir, 'Documents', 'My Games', 'Binding of Isaac Afterbirth+', 'log.txt');
    fs.mkdirSync(path.dirname(abPlusPath), { recursive: true });
    fs.writeFileSync(abPlusPath, '');

    try {
      const result = findLogPathForPlatform('win32', tmpDir);
      expect(result).toBe(abPlusPath);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('Test 4: prefers newest version — when both Rebirth and Repentance exist, returns Repentance path (win32)', () => {
    const tmpDir = '/tmp/isaac-test-win-multi';
    const rebirthPath = path.join(tmpDir, 'Documents', 'My Games', 'Binding of Isaac Rebirth', 'log.txt');
    const repPath = path.join(tmpDir, 'Documents', 'My Games', 'Binding of Isaac Repentance', 'log.txt');

    fs.mkdirSync(path.dirname(rebirthPath), { recursive: true });
    fs.mkdirSync(path.dirname(repPath), { recursive: true });
    fs.writeFileSync(rebirthPath, '');
    fs.writeFileSync(repPath, '');

    try {
      const result = findLogPathForPlatform('win32', tmpDir);
      expect(result).toBe(repPath);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('Test 5: constructs correct macOS paths using ~/Library/Application Support/', () => {
    const homedir = '/Users/testuser';
    const candidates = getLogCandidatePaths('darwin', homedir);

    // All paths should use Library/Application Support
    for (const c of candidates) {
      expect(c).toContain(path.join(homedir, 'Library', 'Application Support'));
    }

    // Repentance Plus should appear before Repentance in the list
    const repPlusIdx = candidates.findIndex((p) => p.includes('Repentance Plus'));
    const repIdx = candidates.findIndex((p) => p.includes('Repentance') && !p.includes('Repentance Plus'));
    expect(repPlusIdx).toBeGreaterThanOrEqual(0);
    expect(repIdx).toBeGreaterThanOrEqual(0);
    expect(repPlusIdx).toBeLessThan(repIdx);
  });

  it('Test 6: constructs correct Windows paths using Documents/My Games/', () => {
    const homedir = 'C:\\Users\\TestUser';
    const candidates = getLogCandidatePaths('win32', homedir);

    for (const c of candidates) {
      expect(c).toContain(path.join(homedir, 'Documents', 'My Games'));
    }

    // Should include all 5 version folders
    const versionFolders = ['Repentance Plus', 'Repentance', 'Afterbirth+', 'Afterbirth', 'Rebirth'];
    for (const folder of versionFolders) {
      expect(candidates.some((c) => c.includes(folder))).toBe(true);
    }
  });

  it('Test 7: includes "Repentance Plus" in search order before "Repentance" (darwin)', () => {
    const tmpDir = '/tmp/isaac-test-mac-repplus';
    const repPlusPath = path.join(tmpDir, 'Library', 'Application Support', 'Binding of Isaac Repentance Plus', 'log.txt');
    const repPath = path.join(tmpDir, 'Library', 'Application Support', 'Binding of Isaac Repentance', 'log.txt');

    // Create both paths — Repentance Plus should be returned first
    fs.mkdirSync(path.dirname(repPlusPath), { recursive: true });
    fs.mkdirSync(path.dirname(repPath), { recursive: true });
    fs.writeFileSync(repPlusPath, '');
    fs.writeFileSync(repPath, '');

    try {
      const result = findLogPathForPlatform('darwin', tmpDir);
      expect(result).toBe(repPlusPath);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
