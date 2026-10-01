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

  async toggleFullscreen(): Promise<IApiResponse<void>> {
    return this.invoke<void>(IPC_CHANNELS.WINDOW.TOGGLE_FULLSCREEN);
  }

  async getIsMaximized(): Promise<IApiResponse<boolean>> {
    return this.invoke<boolean>(IPC_CHANNELS.WINDOW.GET_IS_MAXIMIZED);
  }

  onMaximizeChange(callback: (isMaximized: boolean) => void): () => void {
    return window.electron.on(IPC_CHANNELS.WINDOW.ON_MAXIMIZE_CHANGE, (_event, isMaximized) => {
      callback(isMaximized as boolean);
    });
  }

  async getAppVersion(): Promise<IApiResponse<string>> {
    return this.invoke<string>(IPC_CHANNELS.APP.GET_VERSION);
  }

  async quitApp(): Promise<IApiResponse<void>> {
    return this.invoke<void>(IPC_CHANNELS.APP.QUIT);
  }
}

export const windowService = new WindowIpcService();
