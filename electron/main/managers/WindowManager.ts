import { BrowserWindow, app, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IPC_CHANNELS } from '../../../shared/ipc/channels';
import type { IWindowConfig } from '../../../shared/types';
import { getWindowStateHelper, logger, LogSource } from '../helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_ROOT = path.join(__dirname, '..');
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
const MAIN_DIST = path.join(APP_ROOT, 'dist-electron');
const RENDERER_DIST = path.join(APP_ROOT, 'dist');
const VITE_PUBLIC = VITE_DEV_SERVER_URL 
  ? path.join(APP_ROOT, 'public') 
  : RENDERER_DIST;

export type WindowId = 'main' | string;

interface ManagedWindow {
  id: WindowId;
  window: BrowserWindow;
  config: IWindowConfig;
}

export class WindowManager {
  private static instance: WindowManager;
  private windows: Map<WindowId, ManagedWindow> = new Map();
  private saveStateDebounceTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.registerIpcHandlers();
  }

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  private registerIpcHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.WINDOW.MINIMIZE, (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.minimize();
      return { success: true };
    });

    ipcMain.handle(IPC_CHANNELS.WINDOW.MAXIMIZE, (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        if (window.isMaximized()) {
          window.unmaximize();
        } else {
          window.maximize();
        }
      }
      return { success: true };
    });

    ipcMain.handle(IPC_CHANNELS.WINDOW.CLOSE, (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.close();
      return { success: true };
    });

    ipcMain.handle(IPC_CHANNELS.WINDOW.TOGGLE_FULLSCREEN, (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.setFullScreen(!window.isFullScreen());
      }
      return { success: true };
    });

    ipcMain.handle(IPC_CHANNELS.WINDOW.GET_IS_MAXIMIZED, (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      return { success: true, data: window?.isMaximized() ?? false };
    });

    ipcMain.handle(IPC_CHANNELS.APP.GET_VERSION, () => {
      return { success: true, data: app.getVersion() };
    });

    ipcMain.handle(IPC_CHANNELS.APP.QUIT, () => {
      app.quit();
      return { success: true };
    });
  }

  private setupWindowStateTracking(window: BrowserWindow): void {
    const stateHelper = getWindowStateHelper();

    const debouncedSave = () => {
      if (this.saveStateDebounceTimer) {
        clearTimeout(this.saveStateDebounceTimer);
      }
      this.saveStateDebounceTimer = setTimeout(() => {
        stateHelper.save();
      }, 500);
    };

    window.on('resize', () => {
      if (!window.isMaximized() && !window.isMinimized() && !window.isFullScreen()) {
        stateHelper.updateBounds(window.getBounds());
        debouncedSave();
      }
    });

    window.on('move', () => {
      if (!window.isMaximized() && !window.isMinimized() && !window.isFullScreen()) {
        stateHelper.updateBounds(window.getBounds());
        debouncedSave();
      }
    });

    window.on('maximize', () => {
      stateHelper.updateMaximized(true);
      debouncedSave();
      this.notifyMaximizeChange(window, true);
    });

    window.on('unmaximize', () => {
      stateHelper.updateMaximized(false);
      debouncedSave();
      this.notifyMaximizeChange(window, false);
    });

    window.on('close', () => {
      if (this.saveStateDebounceTimer) {
        clearTimeout(this.saveStateDebounceTimer);
      }
      if (!window.isMaximized()) {
        stateHelper.updateBounds(window.getBounds());
      }
      stateHelper.save();
    });

    logger.info(LogSource.MANAGER, 'WindowManager', 'Window state tracking enabled');
  }

  private notifyMaximizeChange(window: BrowserWindow, isMaximized: boolean): void {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.WINDOW.ON_MAXIMIZE_CHANGE, isMaximized);
    }
  }

  createMainWindow(config?: Partial<IWindowConfig>): BrowserWindow {
    const stateHelper = getWindowStateHelper();
    const savedState = stateHelper.getWindowOptions();

    const defaultConfig: IWindowConfig = {
      width: savedState.width,
      height: savedState.height,
      minWidth: 800,
      minHeight: 600,
      title: 'Arsenal',
      resizable: true,
      frame: false,
      backgroundColor: '#141414',
    };

    const mergedConfig = { ...defaultConfig, ...config };

    const mainWindow = new BrowserWindow({
      x: savedState.x,
      y: savedState.y,
      width: mergedConfig.width,
      height: mergedConfig.height,
      minWidth: mergedConfig.minWidth,
      minHeight: mergedConfig.minHeight,
      title: mergedConfig.title,
      resizable: mergedConfig.resizable,
      frame: mergedConfig.frame,
      backgroundColor: mergedConfig.backgroundColor,
      icon: path.join(VITE_PUBLIC, 'rsnl_logo.png'),
      show: false,
      webPreferences: {
        preload: path.join(MAIN_DIST, 'preload.mjs'),
        nodeIntegration: false,
        contextIsolation: true,
        devTools: !!VITE_DEV_SERVER_URL,
      },
    });

    this.setupWindowStateTracking(mainWindow);

    mainWindow.once('ready-to-show', () => {
      if (stateHelper.shouldMaximize()) {
        mainWindow.maximize();
      }
      mainWindow.show();
    });

    if (VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(VITE_DEV_SERVER_URL);
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'));
    }

    this.windows.set('main', {
      id: 'main',
      window: mainWindow,
      config: mergedConfig,
    });

    mainWindow.on('closed', () => {
      this.windows.delete('main');
    });

    logger.info(LogSource.MANAGER, 'WindowManager', 'Main window created with saved state', {
      x: savedState.x,
      y: savedState.y,
      width: mergedConfig.width,
      height: mergedConfig.height,
      isMaximized: stateHelper.shouldMaximize(),
    });

    return mainWindow;
  }

  createWindow(id: WindowId, config: IWindowConfig, route?: string): BrowserWindow {
    if (this.windows.has(id)) {
      const existing = this.windows.get(id)!;
      existing.window.focus();
      return existing.window;
    }

    const window = new BrowserWindow({
      width: config.width ?? 800,
      height: config.height ?? 600,
      minWidth: config.minWidth,
      minHeight: config.minHeight,
      title: config.title,
      resizable: config.resizable ?? true,
      frame: config.frame ?? true,
      parent: this.getMainWindow() ?? undefined,
      webPreferences: {
        preload: path.join(MAIN_DIST, 'preload.mjs'),
        nodeIntegration: false,
        contextIsolation: true,
        devTools: !!VITE_DEV_SERVER_URL,
      },
    });

    if (VITE_DEV_SERVER_URL) {
      const url = route 
        ? `${VITE_DEV_SERVER_URL}#${route}` 
        : VITE_DEV_SERVER_URL;
      window.loadURL(url);
    } else {
      window.loadFile(path.join(RENDERER_DIST, 'index.html'), {
        hash: route,
      });
    }

    this.windows.set(id, { id, window, config });

    window.on('closed', () => {
      this.windows.delete(id);
    });

    return window;
  }

  getWindow(id: WindowId): BrowserWindow | null {
    return this.windows.get(id)?.window ?? null;
  }

  getMainWindow(): BrowserWindow | null {
    return this.getWindow('main');
  }

  getAllWindows(): BrowserWindow[] {
    return Array.from(this.windows.values()).map((w) => w.window);
  }

  closeWindow(id: WindowId): boolean {
    const managed = this.windows.get(id);
    if (managed) {
      managed.window.close();
      return true;
    }
    return false;
  }

  closeAllWindows(): void {
    for (const managed of this.windows.values()) {
      managed.window.close();
    }
    this.windows.clear();
  }

  sendToWindow(id: WindowId, channel: string, ...args: unknown[]): boolean {
    const window = this.getWindow(id);
    if (window && !window.isDestroyed()) {
      window.webContents.send(channel, ...args);
      return true;
    }
    return false;
  }

  broadcast(channel: string, ...args: unknown[]): void {
    for (const managed of this.windows.values()) {
      if (!managed.window.isDestroyed()) {
        managed.window.webContents.send(channel, ...args);
      }
    }
  }
}

export const getWindowManager = () => WindowManager.getInstance();
