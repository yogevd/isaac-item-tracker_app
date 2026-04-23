import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS } from '../shared/types'
import type { RendererApi, ItemData } from '../shared/types'

const api: RendererApi = {
  onItemPickup: (cb) => {
    const handler = (_e: Electron.IpcRendererEvent, data: { item: ItemData | null }): void => cb(data)
    ipcRenderer.on(IPC_CHANNELS.ITEM_PICKUP, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ITEM_PICKUP, handler)
  },
  onItemRemoval: (cb) => {
    const handler = (_e: Electron.IpcRendererEvent, data: { itemId: number }): void => cb(data)
    ipcRenderer.on(IPC_CHANNELS.ITEM_REMOVAL, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ITEM_REMOVAL, handler)
  },
  onRunReset: (cb) => {
    const handler = (_e: Electron.IpcRendererEvent, data: { seed: string | null }): void => cb(data)
    ipcRenderer.on(IPC_CHANNELS.RUN_RESET, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.RUN_RESET, handler)
  },
  onFloorChange: (cb) => {
    const handler = (_e: Electron.IpcRendererEvent, data: { stage: number; stageType: number }): void => cb(data)
    ipcRenderer.on(IPC_CHANNELS.FLOOR_CHANGE, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.FLOOR_CHANGE, handler)
  },
  getInitialState: () => ipcRenderer.invoke(IPC_CHANNELS.GET_INITIAL_STATE),
}

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
