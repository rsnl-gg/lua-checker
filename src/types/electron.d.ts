import type { IpcRendererEvent } from 'electron';

export interface IElectronAPI {
  invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;
  on: (channel: string, callback: (event: IpcRendererEvent, ...args: unknown[]) => void) => () => void;
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}

export {};
