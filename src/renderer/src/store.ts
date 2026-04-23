import { create } from 'zustand'
import type { ItemData, GameVersion, ResolvedRunState } from '../../shared/types'

interface TrackerState {
  version: GameVersion | null
  seed: string | null
  items: ItemData[]
  floor: { stage: number; stageType: number } | null
  setInitialState: (state: ResolvedRunState) => void
  addItem: (item: ItemData) => void
  removeItem: (itemId: number) => void
  resetRun: (seed: string | null) => void
  setFloor: (floor: { stage: number; stageType: number }) => void
}

export const useTrackerStore = create<TrackerState>((set) => ({
  version: null,
  seed: null,
  items: [],
  floor: null,
  setInitialState: (state) => set(state),
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  removeItem: (itemId) => set((s) => ({ items: s.items.filter((i) => i.id !== itemId) })),
  resetRun: (seed) => set({ seed, items: [], floor: null }),
  setFloor: (floor) => set({ floor }),
}))
