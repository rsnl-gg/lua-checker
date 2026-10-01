export { IpcClient } from './IpcClient';
export { windowService } from './WindowIpcService';

export type { IApiResponse, IQueryOptions } from '../../../shared/types';

// To add a new IPC service:
// 1. Create YourEntityIpcService.ts extending IpcClient
// 2. Export it here: export { yourEntityService } from './YourEntityIpcService';
