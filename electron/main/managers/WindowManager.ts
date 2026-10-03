import { BrowserWindow, ipcMain, Rectangle } from 'electron';
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
  private cappedRestoreBounds: WeakMap<BrowserWindow, Rectangle> = new WeakMap();
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
        const config = this.findManagedWindow(window)?.config;
        if (config && !this.isMaximizable(config)) {
          return { success: true };
        }
        if (config && this.hasSizeCap(config)) {
          this.toggleCappedSize(window, config);
        } else if (window.isMaximized()) {
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

    ipcMain.handle(IPC_CHANNELS.WINDOW.GET_IS_MAXIMIZED, (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      return { success: true, data: window?.isMaximized() ?? false };
    });

    ipcMain.handle(IPC_CHANNELS.WINDOW.GET_MAXIMIZABLE, (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      const config = window ? this.findManagedWindow(window)?.config : undefined;
      return { success: true, data: config ? this.isMaximizable(config) : true };
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

  private findManagedWindow(window: BrowserWindow): ManagedWindow | undefined {
    for (const managed of this.windows.values()) {
      if (managed.window === window) {
        return managed;
      }
    }
    return undefined;
  }

  private hasSizeCap(config: IWindowConfig): boolean {
    return config.maxWidth !== undefined || config.maxHeight !== undefined;
  }

  private isMaximizable(config: IWindowConfig): boolean {
    return config.maximizable !== false;
  }

  private clampDimension(value: number, min?: number, max?: number): number {
    let size = value;
    if (min !== undefined) {
      size = Math.max(size, min);
    }
    if (max !== undefined) {
      size = Math.min(size, max);
    }
    return size;
  }

  private applySizeLimits(window: BrowserWindow, config: IWindowConfig): void {
    if (config.minWidth !== undefined && config.minHeight !== undefined) {
      window.setMinimumSize(config.minWidth, config.minHeight);
    }

    if (config.maxWidth !== undefined && config.maxHeight !== undefined) {
      window.setMaximumSize(config.maxWidth, config.maxHeight);
    }
  }

  private toggleCappedSize(window: BrowserWindow, config: IWindowConfig): void {
    if (window.isMaximized()) {
      window.unmaximize();
      return;
    }

    const bounds = window.getBounds();
    const maxWidth = config.maxWidth ?? bounds.width;
    const maxHeight = config.maxHeight ?? bounds.height;
    const atCap = bounds.width >= maxWidth - 1 && bounds.height >= maxHeight - 1;
    const restore = this.cappedRestoreBounds.get(window);

    if (atCap && restore) {
      window.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: this.clampDimension(restore.width, config.minWidth, config.maxWidth),
        height: this.clampDimension(restore.height, config.minHeight, config.maxHeight),
      });
      this.cappedRestoreBounds.delete(window);
      this.notifyMaximizeChange(window, false);
      return;
    }

    if (atCap) {
      return;
    }

    this.cappedRestoreBounds.set(window, bounds);
    window.setBounds({
      x: bounds.x,
      y: bounds.y,
      width: maxWidth,
      height: maxHeight,
    });
    this.notifyMaximizeChange(window, true);
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
      maximizable: true,
      frame: false,
      backgroundColor: '#141414',
    };

    const mergedConfig: IWindowConfig = {
      ...defaultConfig,
      ...config,
      width: this.clampDimension(
        config?.width ?? savedState.width,
        config?.minWidth ?? defaultConfig.minWidth,
        config?.maxWidth,
      ),
      height: this.clampDimension(
        config?.height ?? savedState.height,
        config?.minHeight ?? defaultConfig.minHeight,
        config?.maxHeight,
      ),
    };

    const mainWindow = new BrowserWindow({
      x: savedState.x,
      y: savedState.y,
      width: mergedConfig.width,
      height: mergedConfig.height,
      minWidth: mergedConfig.minWidth,
      minHeight: mergedConfig.minHeight,
      maxWidth: mergedConfig.maxWidth,
      maxHeight: mergedConfig.maxHeight,
      title: mergedConfig.title,
      resizable: mergedConfig.resizable,
      maximizable: this.isMaximizable(mergedConfig),
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

    this.applySizeLimits(mainWindow, mergedConfig);
    this.setupWindowStateTracking(mainWindow);

    mainWindow.once('ready-to-show', () => {
      this.applySizeLimits(mainWindow, mergedConfig);

      const canRestoreMaximized = this.isMaximizable(mergedConfig) && !this.hasSizeCap(mergedConfig);
      if (stateHelper.shouldMaximize() && canRestoreMaximized) {
        mainWindow.maximize();
      } else if (!canRestoreMaximized && stateHelper.shouldMaximize()) {
        stateHelper.updateMaximized(false);
        stateHelper.save();
      }

      mainWindow.show();
    });

    if (VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(VITE_DEV_SERVER_URL);
      mainWindow.webContents.openDevTools({ mode: 'detach' });
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

  getWindow(id: WindowId): BrowserWindow | null {
    return this.windows.get(id)?.window ?? null;
  }

  getMainWindow(): BrowserWindow | null {
    return this.getWindow('main');
  }
}

export const getWindowManager = () => WindowManager.getInstance();
