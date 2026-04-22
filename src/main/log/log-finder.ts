// log-finder.ts
// Auto-detects the Binding of Isaac log.txt path across macOS and Windows.
// Searches from newest version (Repentance Plus) to oldest (Rebirth) and
// returns the first path where log.txt exists.

import os from 'os';
import path from 'path';
import fs from 'fs';

/**
 * Version folder names in newest-to-oldest search order.
 * "Repentance Plus" is the folder name for the Repentance+ DLC (free update).
 */
const VERSION_FOLDERS = [
  'Repentance Plus',
  'Repentance',
  'Afterbirth+',
  'Afterbirth',
  'Rebirth',
] as const;

/**
 * Returns all candidate log.txt paths for the given platform and homedir,
 * in newest-to-oldest search order. Useful for testing and error messages.
 */
export function getLogCandidatePaths(platform: string, homedir: string): string[] {
  const candidates: string[] = [];

  for (const folder of VERSION_FOLDERS) {
    let candidate: string;

    if (platform === 'win32') {
      candidate = path.join(
        homedir,
        'Documents',
        'My Games',
        `Binding of Isaac ${folder}`,
        'log.txt',
      );
    } else if (platform === 'darwin') {
      candidate = path.join(
        homedir,
        'Library',
        'Application Support',
        `Binding of Isaac ${folder}`,
        'log.txt',
      );
    } else {
      // Linux and other platforms are out of scope for this version
      continue;
    }

    candidates.push(candidate);
  }

  return candidates;
}

/**
 * Finds the log.txt path for the given platform and homedir.
 * Searches from newest to oldest version and returns the first path
 * where log.txt exists, or null if none found.
 *
 * This is the testable core — exported separately so tests can call it
 * without mocking os or process modules.
 */
export function findLogPathForPlatform(platform: string, homedir: string): string | null {
  const candidates = getLogCandidatePaths(platform, homedir);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Auto-detects the Binding of Isaac log.txt path on the current machine.
 * Returns the path if found, or null if the game has not been run yet
 * or is installed on an unsupported platform.
 */
export function findLogPath(): string | null {
  return findLogPathForPlatform(process.platform, os.homedir());
}
