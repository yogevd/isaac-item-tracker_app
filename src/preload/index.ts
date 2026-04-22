import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS } from '../shared/types'

// Custom APIs for renderer — typed IPC event listeners
const api = {
  onItemPickup: (cb: (data: { itemId: number }) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.ITEM_PICKUP, (_e, data) => cb(data))
  },
  onItemRemoval: (cb: (data: { itemId: number }) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.ITEM_REMOVAL, (_e, data) => cb(data))
  },
  onRunReset: (cb: (data: { seed: string | null }) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.RUN_RESET, (_e, data) => cb(data))
  },
  onFloorChange: (cb: (data: { stage: number; stageType: number }) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.FLOOR_CHANGE, (_e, data) => cb(data))
  },
  getInitialState: (): Promise<unknown> => ipcRenderer.invoke(IPC_CHANNELS.GET_INITIAL_STATE),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
