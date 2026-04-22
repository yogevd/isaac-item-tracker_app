// log-watcher.ts
// LogWatcher: chokidar-based file tail with offset-based reading and truncation detection.
// Main process only — uses Node.js fs APIs not available in renderer.

import chokidar, { type FSWatcher } from 'chokidar';
import fs from 'fs';
import { parseLine } from './log-parser';
import type { LogEvent } from '../../shared/types';

export class LogWatcher {
  private offset = 0;
  private watcher: FSWatcher | null = null;

  /**
   * Start watching logPath. Calls onEvent for each parsed LogEvent.
   * Calls onTruncation when the log file is truncated (game restart).
   *
   * On start, immediately processes any existing file content so the tracker
   * catches up with game state from a log file already in progress.
   */
  start(
    logPath: string,
    onEvent: (event: LogEvent) => void,
    onTruncation?: () => void,
  ): void {
    // Catch up with existing log content on startup
    this.processFile(logPath, onEvent);

    this.watcher = chokidar.watch(logPath, {
      alwaysStat: true,
      // No usePolling — native FSEvents (macOS) and fs.watch (Windows) work for single files
      // No awaitWriteFinish — we want immediate change events for real-time tracking
    });

    this.watcher.on('change', (_path, stats) => {
      if (!stats) return;

      // Truncation: game restarted and recreated/cleared log.txt
      if (stats.size < this.offset) {
        this.offset = 0;
        if (onTruncation) onTruncation();
      }

      this.processFile(logPath, onEvent);
    });
  }

  /**
   * Read new bytes from the current offset to EOF, parse each line, and emit events.
   */
  private processFile(
    logPath: string,
    onEvent: (event: LogEvent) => void,
  ): void {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(logPath);
    } catch {
      return; // File may not exist yet
    }

    if (stat.size <= this.offset) return;

    const fd = fs.openSync(logPath, 'r');
    const buf = Buffer.alloc(stat.size - this.offset);
    fs.readSync(fd, buf, 0, buf.length, this.offset);
    fs.closeSync(fd);
    this.offset = stat.size;

    const text = buf.toString('utf-8');
    const lines = text.split('\n').filter(l => l.trim().length > 0);

    for (const line of lines) {
      const event = parseLine(line);
      if (event) onEvent(event);
    }
  }

  /**
   * Stop watching and reset offset.
   */
  stop(): void {
    this.watcher?.close();
    this.watcher = null;
    this.offset = 0;
  }
}
