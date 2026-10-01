import type { IpcRendererEvent } from 'electron';

export interface IElectronAPI {
  invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;
  send: (channel: string, ...args: unknown[]) => void;
  on: (channel: string, callback: (event: IpcRendererEvent, ...args: unknown[]) => void) => () => void;
  once: (channel: string, callback: (event: IpcRendererEvent, ...args: unknown[]) => void) => void;
  off: (channel: string, callback: (...args: unknown[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}

export {};
