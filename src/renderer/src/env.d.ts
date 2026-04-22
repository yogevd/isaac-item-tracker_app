/// <reference types="vite/client" />

import type { RunState } from '../../shared/types'

declare global {
  interface Window {
    api: {
      onItemPickup: (cb: (data: { itemId: number }) => void) => () => void
      onItemRemoval: (cb: (data: { itemId: number }) => void) => () => void
      onRunReset: (cb: (data: { seed: string | null }) => void) => () => void
      onFloorChange: (cb: (data: { stage: number; stageType: number }) => void) => () => void
      getInitialState: () => Promise<RunState>
    }
  }
}
