import { IPC_CHANNELS } from '../../../shared/ipc/channels';
import { BaseController, type IControllerRoute } from './BaseController';
import { getScannerService } from '../services/ScannerService';

export class ScannerController extends BaseController {
  protected routes: IControllerRoute[] = [
    this.createRouteWithEvent(IPC_CHANNELS.SCANNER.BOOTSTRAP, async (event) => {
      return getScannerService().bootstrap((message) => {
        event.sender.send(IPC_CHANNELS.SCANNER.PROGRESS, message);
      });
    }),
    this.createRouteWithEvent(IPC_CHANNELS.SCANNER.REFRESH, async (event) => {
      return getScannerService().refresh((message) => {
        event.sender.send(IPC_CHANNELS.SCANNER.PROGRESS, message);
      });
    }),
    this.createRoute(IPC_CHANNELS.SCANNER.SET_SCAN_ON_STARTUP, async (enabled) => {
      return getScannerService().setScanOnStartup(Boolean(enabled));
    }),
    this.createRouteWithEvent(IPC_CHANNELS.SCANNER.SET_REPORT, async (event, enabled) => {
      return getScannerService().setReportNexusLua(Boolean(enabled), (message) => {
        event.sender.send(IPC_CHANNELS.SCANNER.PROGRESS, message);
      });
    }),
    this.createRouteWithEvent(IPC_CHANNELS.SCANNER.ADD_PATH, async (event) => {
      return getScannerService().addPathFromDialog((message) => {
        event.sender.send(IPC_CHANNELS.SCANNER.PROGRESS, message);
      });
    }),
    this.createRoute(IPC_CHANNELS.SCANNER.SET_PATH_LABEL, async (payload) => {
      const request = payload as { id?: unknown; label?: unknown } | null;
      return getScannerService().setPathLabel(Number(request?.id), String(request?.label ?? ''));
    }),
    this.createRoute(IPC_CHANNELS.SCANNER.SET_PATH_COLOR, async (payload) => {
      const request = payload as { id?: unknown; color?: unknown } | null;
      return getScannerService().setPathColor(Number(request?.id), String(request?.color ?? ''));
    }),
    this.createRouteWithEvent(IPC_CHANNELS.SCANNER.UPDATE_PATH, async (event, id) => {
      return getScannerService().updatePathFromDialog(Number(id), (message) => {
        event.sender.send(IPC_CHANNELS.SCANNER.PROGRESS, message);
      });
    }),
    this.createRouteWithEvent(IPC_CHANNELS.SCANNER.REMOVE_PATH, async (event, id) => {
      return getScannerService().removePath(Number(id), (message) => {
        event.sender.send(IPC_CHANNELS.SCANNER.PROGRESS, message);
      });
    }),
    this.createRoute(IPC_CHANNELS.SCANNER.GET_SYSTEM_INFO, async () => {
      return getScannerService().getSystemInfo();
    }),
    this.createRoute(IPC_CHANNELS.SCANNER.OPEN_PATH, async (targetPath) => {
      return getScannerService().openPath(String(targetPath ?? ''));
    }),
    this.createRoute(IPC_CHANNELS.SCANNER.OPEN_DOWNLOAD, async () => {
      return getScannerService().openArsenalDownload();
    }),
    this.createRoute(IPC_CHANNELS.SCANNER.HARD_RESET, async () => {
      return getScannerService().hardReset();
    }),
  ];
}

export const createScannerController = () => new ScannerController();
