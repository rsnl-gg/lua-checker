export const IPC_CHANNELS = {
  WINDOW: {
    MINIMIZE: 'window:minimize',
    MAXIMIZE: 'window:maximize',
    CLOSE: 'window:close',
    GET_IS_MAXIMIZED: 'window:getIsMaximized',
    GET_MAXIMIZABLE: 'window:getMaximizable',
    ON_MAXIMIZE_CHANGE: 'window:onMaximizeChange',
  },

  SCANNER: {
    BOOTSTRAP: 'scanner:bootstrap',
    REFRESH: 'scanner:refresh',
    PROGRESS: 'scanner:progress',
    SET_REPORT: 'scanner:setReport',
    SET_SCAN_ON_STARTUP: 'scanner:setScanOnStartup',
    ADD_PATH: 'scanner:addPath',
    UPDATE_PATH: 'scanner:updatePath',
    SET_PATH_COLOR: 'scanner:setPathColor',
    SET_PATH_LABEL: 'scanner:setPathLabel',
    REMOVE_PATH: 'scanner:removePath',
    OPEN_PATH: 'scanner:openPath',
    OPEN_DOWNLOAD: 'scanner:openDownload',
    GET_SYSTEM_INFO: 'scanner:getSystemInfo',
    HARD_RESET: 'scanner:hardReset',
  },
} as const;
