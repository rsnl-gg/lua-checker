import type { IApiResponse } from '../../../shared/types';

export class IpcClient {
  protected async invoke<TResult, TParams = unknown>(
    channel: string,
    params?: TParams
  ): Promise<IApiResponse<TResult>> {
    if (!window.electron) {
      return { success: false, error: 'Electron API not available. Running in browser?' };
    }

    try {
      return await window.electron.invoke<IApiResponse<TResult>>(channel, params);
    } catch (error) {
      return { success: false, error: `IPC Error: ${(error as Error).message}` };
    }
  }

  protected on(channel: string, callback: (...args: unknown[]) => void): () => void {
    if (!window.electron) {
      return () => {};
    }

    return window.electron.on(channel, (_event, ...args) => {
      callback(...args);
    });
  }
}
