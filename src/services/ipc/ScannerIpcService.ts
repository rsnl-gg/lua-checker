import { IPC_CHANNELS } from '../../../shared/ipc/channels';
import type { IApiResponse } from '../../../shared/types';
import type { IScannerState, ISetPathColorRequest, ISetPathLabelRequest, ISystemInfo } from '../../../shared/types/scanner';
import { IpcClient } from './IpcClient';

class ScannerIpcService extends IpcClient {
  bootstrap(): Promise<IApiResponse<IScannerState>> {
    return this.invoke<IScannerState>(IPC_CHANNELS.SCANNER.BOOTSTRAP);
  }

  refresh(): Promise<IApiResponse<IScannerState>> {
    return this.invoke<IScannerState>(IPC_CHANNELS.SCANNER.REFRESH);
  }

  setScanOnStartup(enabled: boolean): Promise<IApiResponse<IScannerState>> {
    return this.invoke<IScannerState, boolean>(IPC_CHANNELS.SCANNER.SET_SCAN_ON_STARTUP, enabled);
  }

  setReportNexusLua(enabled: boolean): Promise<IApiResponse<IScannerState>> {
    return this.invoke<IScannerState, boolean>(IPC_CHANNELS.SCANNER.SET_REPORT, enabled);
  }

  addPath(): Promise<IApiResponse<IScannerState | null>> {
    return this.invoke<IScannerState | null>(IPC_CHANNELS.SCANNER.ADD_PATH);
  }

  setPathLabel(id: number, label: string): Promise<IApiResponse<IScannerState>> {
    return this.invoke<IScannerState, ISetPathLabelRequest>(IPC_CHANNELS.SCANNER.SET_PATH_LABEL, { id, label });
  }

  setPathColor(id: number, color: string): Promise<IApiResponse<IScannerState>> {
    return this.invoke<IScannerState, ISetPathColorRequest>(IPC_CHANNELS.SCANNER.SET_PATH_COLOR, { id, color });
  }

  updatePath(id: number): Promise<IApiResponse<IScannerState | null>> {
    return this.invoke<IScannerState | null, number>(IPC_CHANNELS.SCANNER.UPDATE_PATH, id);
  }

  removePath(id: number): Promise<IApiResponse<IScannerState>> {
    return this.invoke<IScannerState, number>(IPC_CHANNELS.SCANNER.REMOVE_PATH, id);
  }

  getSystemInfo(): Promise<IApiResponse<ISystemInfo>> {
    return this.invoke<ISystemInfo>(IPC_CHANNELS.SCANNER.GET_SYSTEM_INFO);
  }

  openPath(targetPath: string): Promise<IApiResponse<boolean>> {
    return this.invoke<boolean, string>(IPC_CHANNELS.SCANNER.OPEN_PATH, targetPath);
  }

  openArsenalDownload(): Promise<IApiResponse<boolean>> {
    return this.invoke<boolean>(IPC_CHANNELS.SCANNER.OPEN_DOWNLOAD);
  }

  hardReset(): Promise<IApiResponse<boolean>> {
    return this.invoke<boolean>(IPC_CHANNELS.SCANNER.HARD_RESET);
  }

  onProgress(callback: (message: string) => void): () => void {
    return this.on(IPC_CHANNELS.SCANNER.PROGRESS, (message) => {
      if (typeof message === 'string') {
        callback(message);
      }
    });
  }
}

export const scannerService = new ScannerIpcService();
