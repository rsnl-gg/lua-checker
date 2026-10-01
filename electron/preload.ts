import { ipcRenderer, contextBridge, IpcRendererEvent } from 'electron';

export interface IElectronAPI {
  invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;
  send: (channel: string, ...args: unknown[]) => void;
  on: (channel: string, callback: (event: IpcRendererEvent, ...args: unknown[]) => void) => () => void;
  once: (channel: string, callback: (event: IpcRendererEvent, ...args: unknown[]) => void) => void;
  off: (channel: string, callback: (...args: unknown[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

const electronAPI: IElectronAPI = {
  invoke: <T = unknown>(channel: string, ...args: unknown[]): Promise<T> => {
    return ipcRenderer.invoke(channel, ...args);
  },

  send: (channel: string, ...args: unknown[]): void => {
    ipcRenderer.send(channel, ...args);
  },

  on: (channel: string, callback: (event: IpcRendererEvent, ...args: unknown[]) => void): (() => void) => {
    ipcRenderer.on(channel, callback);
    return () => ipcRenderer.removeListener(channel, callback);
  },

  once: (channel: string, callback: (event: IpcRendererEvent, ...args: unknown[]) => void): void => {
    ipcRenderer.once(channel, callback);
  },

  off: (channel: string, callback: (...args: unknown[]) => void): void => {
    ipcRenderer.removeListener(channel, callback);
  },

  removeAllListeners: (channel: string): void => {
    ipcRenderer.removeAllListeners(channel);
  },
};

contextBridge.exposeInMainWorld('electron', electronAPI);

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}
