import { app, shell, BrowserWindow, ipcMain, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { ItemDatabase } from './database/item-database'
import { findLogPath } from './log/log-finder'
import { LogWatcher } from './log/log-watcher'
import { RunStateManager } from './log/run-state'
import { IPC_CHANNELS } from '../shared/types'
import type { ItemData } from '../shared/types'

// Register asset:// scheme before app is ready so the renderer can load item icons.
protocol.registerSchemesAsPrivileged([
  { scheme: 'asset', privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: true } },
])

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Serve item icons via asset:// → resources/data/
  const resourcesDataPath = join(app.getAppPath(), 'resources', 'data')
  protocol.handle('asset', (request) => {
    const urlPath = decodeURIComponent(new URL(request.url).pathname)
    return net.fetch(pathToFileURL(join(resourcesDataPath, urlPath)).toString())
  })

  // Load item database at startup
  let db: ItemDatabase | undefined
  try {
    db = ItemDatabase.load()
    console.log(`[startup] ItemDatabase loaded: ${db.size} items`)
  } catch (err) {
    console.error('[startup] Failed to load ItemDatabase:', err)
  }

  const resolveItem = (itemId: number): ItemData | null => {
    if (!db) return null
    return db.lookup(itemId, stateManager.getState().version ?? 'repentance+')
  }

  // --- Log Pipeline ---
  const stateManager = new RunStateManager()
  const logPath = findLogPath()

  let logWatcher: LogWatcher | null = null

  if (logPath) {
    console.log(`[startup] Watching log file: ${logPath}`)
    logWatcher = new LogWatcher()

    logWatcher.start(
      logPath,
      (event) => {
        stateManager.applyEvent(event)

        const win = BrowserWindow.getAllWindows()[0]
        if (!win) return

        switch (event.type) {
          case 'item-pickup':
            win.webContents.send(IPC_CHANNELS.ITEM_PICKUP, { item: resolveItem(event.itemId) })
            break
          case 'item-removal':
            win.webContents.send(IPC_CHANNELS.ITEM_REMOVAL, { itemId: event.itemId })
            break
          case 'run-start':
            win.webContents.send(IPC_CHANNELS.RUN_RESET, { seed: event.seed })
            break
          case 'floor-change':
            win.webContents.send(IPC_CHANNELS.FLOOR_CHANGE, {
              stage: event.stage,
              stageType: event.stageType,
            })
            break
          case 'version-detected':
            break
        }
      },
      () => {
        stateManager.reset()
        const win = BrowserWindow.getAllWindows()[0]
        if (win) {
          win.webContents.send(IPC_CHANNELS.RUN_RESET, { seed: null })
        }
      },
    )
  } else {
    console.warn('[startup] No log.txt found — start the game to begin tracking')
  }

  // Return resolved initial state so renderer doesn't need the item database
  ipcMain.handle(IPC_CHANNELS.GET_INITIAL_STATE, () => {
    const state = stateManager.getState()
    const resolvedItems = state.items
      .map((id) => resolveItem(id))
      .filter((item): item is ItemData => item !== null)
    return { ...state, items: resolvedItems }
  })

  app.on('before-quit', () => {
    logWatcher?.stop()
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
