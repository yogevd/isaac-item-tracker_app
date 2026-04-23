// src/shared/types.ts
// Types shared between the main process (Node.js) and renderer process (Chromium).
// Import this file using relative paths from both sides:
//   Main:     import { GameVersion } from '../../shared/types'
//   Renderer: import { GameVersion } from '../../shared/types'

// ---- Version Support --------------------------------------------------------

/**
 * Supported Binding of Isaac game versions in DLC release order.
 * The order is significant: VERSION_HIERARCHY uses index position
 * to determine whether an item is available in a given version.
 */
export type GameVersion =
  | 'rebirth'
  | 'afterbirth'
  | 'afterbirth+'
  | 'repentance'
  | 'repentance+';

/**
 * DLC release order used for version-gated item filtering.
 * An item is visible in version V if its introducedIn index <= V's index.
 */
export const VERSION_HIERARCHY: readonly GameVersion[] = [
  'rebirth',
  'afterbirth',
  'afterbirth+',
  'repentance',
  'repentance+',
] as const;

// ---- Item Data --------------------------------------------------------------

/**
 * A single collectible item as stored in the bundled database.
 * iconPath is relative to the resources/images/ directory.
 */
export interface ItemData {
  id: number;
  name: string;
  description: string;
  /** Relative path: "collectibles/collectibles_NNN.png" */
  iconPath: string;
  introducedIn: GameVersion;
  quality?: number;
}

// ---- IPC Channel Constants --------------------------------------------------

/**
 * Typed IPC channel names used by contextBridge (Phase 2+).
 * Defined here to prevent string duplication across main and preload.
 */
export const IPC_CHANNELS = {
  GET_INITIAL_STATE: 'get-initial-state',
  ITEM_PICKUP:       'item-pickup',
  ITEM_REMOVAL:      'item-removal',
  RUN_RESET:         'run-reset',
  FLOOR_CHANGE:      'floor-change',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

// ---- Log Pipeline Types (Phase 2) ------------------------------------------

/**
 * A parsed event from a log line. Returned by parseLine().
 */
export type LogEvent =
  | { type: 'version-detected'; version: GameVersion }
  | { type: 'run-start'; seed: string }
  | { type: 'item-pickup'; itemId: number }
  | { type: 'item-removal'; itemId: number }
  | { type: 'floor-change'; stage: number; stageType: number };

/**
 * The current state of a run, maintained by the main process.
 * Renderer receives read-only snapshots via IPC.
 */
export interface RunState {
  version: GameVersion | null;
  seed: string | null;
  items: number[];
  floor: { stage: number; stageType: number } | null;
}

export const INITIAL_RUN_STATE: RunState = {
  version: null,
  seed: null,
  items: [],
  floor: null,
};

// ---- Renderer-facing IPC payload types (Phase 3) ----------------------------

/** Sent from main to renderer for initial state; items are resolved to full ItemData. */
export interface ResolvedRunState {
  version: GameVersion | null;
  seed: string | null;
  items: ItemData[];
  floor: { stage: number; stageType: number } | null;
}

/** API exposed via contextBridge to the renderer. Each listener returns an unsubscribe function. */
export interface RendererApi {
  onItemPickup: (cb: (data: { item: ItemData | null }) => void) => () => void;
  onItemRemoval: (cb: (data: { itemId: number }) => void) => () => void;
  onRunReset: (cb: (data: { seed: string | null }) => void) => () => void;
  onFloorChange: (cb: (data: { stage: number; stageType: number }) => void) => () => void;
  getInitialState: () => Promise<ResolvedRunState>;
}
