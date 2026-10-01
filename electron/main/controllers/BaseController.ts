import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { logger, LogSource } from '../helpers';
import type { IApiResponse } from '../../../shared/types';

export type IpcHandler<TParams = unknown, TResult = unknown> = (
  event: IpcMainInvokeEvent,
  params: TParams
) => Promise<IApiResponse<TResult>>;

export interface IControllerRoute<TParams = unknown, TResult = unknown> {
  channel: string;
  handler: IpcHandler<TParams, TResult>;
}

export abstract class BaseController {
  protected abstract routes: IControllerRoute[];

  register(): void {
    for (const route of this.routes) {
      ipcMain.handle(route.channel, async (event, params) => {
        try {
          return await route.handler(event, params);
        } catch (error) {
          logger.error(LogSource.IPC, route.channel, 'Handler error', error);
          return {
            success: false,
            error: `Internal error: ${(error as Error).message}`,
          } as IApiResponse<unknown>;
        }
      });
    }

    logger.info(LogSource.CONTROLLER, this.constructor.name, `Registered ${this.routes.length} routes`);
  }

  unregister(): void {
    for (const route of this.routes) {
      ipcMain.removeHandler(route.channel);
    }
  }

  protected createRoute<TParams, TResult>(
    channel: string,
    handler: (params: TParams) => Promise<IApiResponse<TResult>>
  ): IControllerRoute<TParams, TResult> {
    return {
      channel,
      handler: async (_event, params) => handler(params),
    };
  }

  protected createRouteWithEvent<TParams, TResult>(
    channel: string,
    handler: IpcHandler<TParams, TResult>
  ): IControllerRoute<TParams, TResult> {
    return { channel, handler };
  }
}
