export interface IApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type {
  AppPlatform,
  ILuaFile,
  IScanPath,
  IScannedMod,
  IScannerState,
  ScanPathSource,
} from './scanner';

export interface IWindowConfig {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  title?: string;
  resizable?: boolean;
  maximizable?: boolean;
  frame?: boolean;
  backgroundColor?: string;
}
