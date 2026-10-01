export const IPC_CHANNELS = {
  // Add your entity channels here:
  // ENTITY: {
  //   FIND_ALL: 'entity:findAll',
  //   FIND_BY_ID: 'entity:findById',
  //   CREATE: 'entity:create',
  //   UPDATE: 'entity:update',
  //   DELETE: 'entity:delete',
  // },

  WINDOW: {
    MINIMIZE: 'window:minimize',
    MAXIMIZE: 'window:maximize',
    CLOSE: 'window:close',
    TOGGLE_FULLSCREEN: 'window:toggleFullscreen',
    GET_IS_MAXIMIZED: 'window:getIsMaximized',
    ON_MAXIMIZE_CHANGE: 'window:onMaximizeChange',
  },

  APP: {
    GET_VERSION: 'app:getVersion',
    QUIT: 'app:quit',
  },

  DATABASE: {
    EXPORT: 'database:export',
    IMPORT: 'database:import',
  },
} as const;

export type IpcChannelValue<T> = T extends Record<string, infer U> 
  ? U extends string 
    ? U 
    : U extends Record<string, string> 
      ? IpcChannelValue<U> 
      : never 
  : never;

export type AllIpcChannels = IpcChannelValue<typeof IPC_CHANNELS>;
