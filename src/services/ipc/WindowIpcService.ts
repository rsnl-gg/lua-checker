import { IpcClient } from './IpcClient';
import { IPC_CHANNELS } from '../../../shared/ipc/channels';
import type { IApiResponse } from '../../../shared/types';

class WindowIpcService extends IpcClient {
  async minimize(): Promise<IApiResponse<void>> {
    return this.invoke<void>(IPC_CHANNELS.WINDOW.MINIMIZE);
  }

  async maximize(): Promise<IApiResponse<void>> {
    return this.invoke<void>(IPC_CHANNELS.WINDOW.MAXIMIZE);
  }

  async close(): Promise<IApiResponse<void>> {
    return this.invoke<void>(IPC_CHANNELS.WINDOW.CLOSE);
  }

  async getIsMaximized(): Promise<IApiResponse<boolean>> {
    return this.invoke<boolean>(IPC_CHANNELS.WINDOW.GET_IS_MAXIMIZED);
  }

  async getMaximizable(): Promise<IApiResponse<boolean>> {
    return this.invoke<boolean>(IPC_CHANNELS.WINDOW.GET_MAXIMIZABLE);
  }

  onMaximizeChange(callback: (isMaximized: boolean) => void): () => void {
    return window.electron.on(IPC_CHANNELS.WINDOW.ON_MAXIMIZE_CHANGE, (_event, isMaximized) => {
      callback(isMaximized as boolean);
    });
  }
}

export const windowService = new WindowIpcService();
