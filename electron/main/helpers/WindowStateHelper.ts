import { app, screen, Rectangle, Display } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { logger, LogSource } from './LoggerHelper';

export interface IWindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
  displayId: number;
}

const DEFAULT_STATE: IWindowState = {
  x: -1,
  y: -1,
  width: 1200,
  height: 800,
  isMaximized: false,
  displayId: 0,
};

export class WindowStateHelper {
  private static instance: WindowStateHelper;
  private readonly filePath: string;
  private persistenceEnabled = true;
  private state: IWindowState;

  private constructor() {
    const userDataPath = app.getPath('userData');
    this.filePath = path.join(userDataPath, 'windowdata.ini');
    this.state = this.load();
    logger.info(LogSource.HELPER, 'WindowStateHelper', `INI file path: ${this.filePath}`);
  }

  public static getInstance(): WindowStateHelper {
    if (!WindowStateHelper.instance) {
      WindowStateHelper.instance = new WindowStateHelper();
    }
    return WindowStateHelper.instance;
  }

  private load(): IWindowState {
    try {
      if (!fs.existsSync(this.filePath)) {
        logger.info(LogSource.HELPER, 'WindowStateHelper', 'No existing state file, using defaults');
        return { ...DEFAULT_STATE };
      }

      const content = fs.readFileSync(this.filePath, 'utf-8');
      const state = this.parseIni(content);
      
      const validatedState = this.validateStateForCurrentDisplays(state);
      
      logger.info(LogSource.HELPER, 'WindowStateHelper', 'Loaded state', validatedState);
      return validatedState;
    } catch (error) {
      logger.error(LogSource.HELPER, 'WindowStateHelper', 'Failed to load state', error);
      return { ...DEFAULT_STATE };
    }
  }

  private parseIni(content: string): IWindowState {
    const state: IWindowState = { ...DEFAULT_STATE };
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#') || trimmed.startsWith('[')) {
        continue;
      }

      const [key, value] = trimmed.split('=').map((s) => s.trim());
      if (!key || value === undefined) continue;

      switch (key.toLowerCase()) {
        case 'x':
          state.x = parseInt(value, 10);
          break;
        case 'y':
          state.y = parseInt(value, 10);
          break;
        case 'width':
          state.width = parseInt(value, 10);
          break;
        case 'height':
          state.height = parseInt(value, 10);
          break;
        case 'ismaximized':
          state.isMaximized = value.toLowerCase() === 'true';
          break;
        case 'displayid':
          state.displayId = parseInt(value, 10);
          break;
      }
    }

    return state;
  }

  private toIni(state: IWindowState): string {
    const lines: string[] = [
      '; Arsenal Window State',
      '; This file stores the window position and state',
      '; Do not edit manually unless you know what you are doing',
      '',
      '[Window]',
      `x=${state.x}`,
      `y=${state.y}`,
      `width=${state.width}`,
      `height=${state.height}`,
      `isMaximized=${state.isMaximized}`,
      `displayId=${state.displayId}`,
      '',
    ];
    return lines.join('\n');
  }

  private validateStateForCurrentDisplays(state: IWindowState): IWindowState {
    const displays = screen.getAllDisplays();
    
    if (state.x === -1 || state.y === -1) {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      return {
        ...state,
        x: Math.round((screenWidth - state.width) / 2) + primaryDisplay.workArea.x,
        y: Math.round((screenHeight - state.height) / 2) + primaryDisplay.workArea.y,
        displayId: primaryDisplay.id,
      };
    }

    const windowBounds: Rectangle = {
      x: state.x,
      y: state.y,
      width: state.width,
      height: state.height,
    };

    let bestDisplay: Display | null = null;
    let bestOverlap = 0;

    for (const display of displays) {
      const overlap = this.calculateOverlap(windowBounds, display.workArea);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestDisplay = display;
      }
    }

    if (bestOverlap < (state.width * state.height) / 2) {
      const originalDisplay = displays.find((d) => d.id === state.displayId);
      const targetDisplay = originalDisplay ?? screen.getPrimaryDisplay();
      
      logger.info(LogSource.HELPER, 'WindowStateHelper', 'Repositioning window to display', {
        displayId: targetDisplay.id,
      });

      return {
        ...state,
        x: Math.round((targetDisplay.workAreaSize.width - state.width) / 2) + targetDisplay.workArea.x,
        y: Math.round((targetDisplay.workAreaSize.height - state.height) / 2) + targetDisplay.workArea.y,
        displayId: targetDisplay.id,
      };
    }

    if (bestDisplay) {
      state.displayId = bestDisplay.id;
    }

    return state;
  }

  private calculateOverlap(rect1: Rectangle, rect2: Rectangle): number {
    const xOverlap = Math.max(0, Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - Math.max(rect1.x, rect2.x));
    const yOverlap = Math.max(0, Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - Math.max(rect1.y, rect2.y));
    return xOverlap * yOverlap;
  }

  public disablePersistence(): void {
    this.persistenceEnabled = false;
  }

  public save(): void {
    if (!this.persistenceEnabled) {
      return;
    }
    try {
      const content = this.toIni(this.state);
      fs.writeFileSync(this.filePath, content, 'utf-8');
    } catch (error) {}
  }

  public updateBounds(bounds: Rectangle): void {
    this.state.x = bounds.x;
    this.state.y = bounds.y;
    this.state.width = bounds.width;
    this.state.height = bounds.height;

    const display = screen.getDisplayMatching(bounds);
    if (display) {
      this.state.displayId = display.id;
    }
  }

  public updateMaximized(isMaximized: boolean): void {
    this.state.isMaximized = isMaximized;
  }

  public getState(): IWindowState {
    return { ...this.state };
  }

  public getWindowOptions(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.state.x,
      y: this.state.y,
      width: this.state.width,
      height: this.state.height,
    };
  }

  public shouldMaximize(): boolean {
    return this.state.isMaximized;
  }
}

export const getWindowStateHelper = () => WindowStateHelper.getInstance();
