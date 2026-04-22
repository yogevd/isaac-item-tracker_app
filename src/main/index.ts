import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { ItemDatabase } from './database/item-database'
import { findLogPath } from './log/log-finder'
import { LogWatcher } from './log/log-watcher'
import { RunStateManager } from './log/run-state'
import { IPC_CHANNELS } from '../shared/types'

function createWindow(): void {
  // Create the browser window.
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

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Load item database at startup
  let db: ItemDatabase | undefined
  try {
    db = ItemDatabase.load()
    console.log(`[startup] ItemDatabase loaded: ${db.size} items`)
  } catch (err) {
    console.error('[startup] Failed to load ItemDatabase:', err)
  }
  void db // Phase 3 will use db to resolve item IDs to full ItemData before sending to renderer

  // --- Log Pipeline (Phase 2) ---
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

        // Push to renderer window
        const win = BrowserWindow.getAllWindows()[0]
        if (!win) return

        switch (event.type) {
          case 'item-pickup':
            win.webContents.send(IPC_CHANNELS.ITEM_PICKUP, { itemId: event.itemId })
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
            // Version is tracked in state but not pushed as a separate IPC event
            break
        }
      },
      () => {
        // onTruncation: game restarted, reset state and notify renderer
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

  // Handle GET_INITIAL_STATE request from renderer (invoked once on mount)
  ipcMain.handle(IPC_CHANNELS.GET_INITIAL_STATE, () => {
    return stateManager.getState()
  })

  // Clean up watcher on quit
  app.on('before-quit', () => {
    logWatcher?.stop()
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
