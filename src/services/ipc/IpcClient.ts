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
      const response = await window.electron.invoke<IApiResponse<TResult>>(channel, params);
      return response;
    } catch (error) {
      return { success: false, error: `IPC Error: ${(error as Error).message}` };
    }
  }

  protected send(channel: string, ...args: unknown[]): void {
    if (window.electron) {
      window.electron.send(channel, ...args);
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

  protected once(channel: string, callback: (...args: unknown[]) => void): void {
    if (window.electron) {
      window.electron.once(channel, (_event, ...args) => {
        callback(...args);
      });
    }
  }
}
