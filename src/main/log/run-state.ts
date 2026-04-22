// run-state.ts
// RunStateManager: applies LogEvent instances to maintain current RunState.
// Single source of truth in the main process; renderer receives read-only snapshots via IPC.

import { RunState, LogEvent, INITIAL_RUN_STATE } from '../../shared/types';

export class RunStateManager {
  private state: RunState = { ...INITIAL_RUN_STATE, items: [] };

  /**
   * Apply a parsed log event to the current state.
   * RUN-02: run-start clears items synchronously before any item-pickup can be processed.
   */
  applyEvent(event: LogEvent): void {
    switch (event.type) {
      case 'version-detected':
        this.state.version = event.version;
        break;
      case 'run-start':
        this.state.seed = event.seed;
        this.state.items = []; // RUN-02: clear items before any pickups in new run
        this.state.floor = null;
        break;
      case 'item-pickup':
        this.state.items.push(event.itemId);
        break;
      case 'item-removal': {
        const idx = this.state.items.indexOf(event.itemId);
        if (idx !== -1) this.state.items.splice(idx, 1);
        break;
      }
      case 'floor-change':
        this.state.floor = { stage: event.stage, stageType: event.stageType };
        break;
    }
  }

  /**
   * Returns a defensive copy of the current state.
   * Mutations to the returned object do not affect internal state.
   */
  getState(): RunState {
    return {
      ...this.state,
      items: [...this.state.items],
      floor: this.state.floor ? { ...this.state.floor } : null,
    };
  }

  /**
   * Reset state to initial values. Called on log truncation (game restart).
   */
  reset(): void {
    this.state = { ...INITIAL_RUN_STATE, items: [] };
  }
}
