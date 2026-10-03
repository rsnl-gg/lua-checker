import { ipcRenderer, contextBridge, IpcRendererEvent } from 'electron';

export interface IElectronAPI {
  invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;
  on: (channel: string, callback: (event: IpcRendererEvent, ...args: unknown[]) => void) => () => void;
}

const electronAPI: IElectronAPI = {
  invoke: <T = unknown>(channel: string, ...args: unknown[]): Promise<T> => {
    return ipcRenderer.invoke(channel, ...args);
  },

  on: (channel: string, callback: (event: IpcRendererEvent, ...args: unknown[]) => void): (() => void) => {
    ipcRenderer.on(channel, callback);
    return () => ipcRenderer.removeListener(channel, callback);
  },
};

contextBridge.exposeInMainWorld('electron', electronAPI);

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}
