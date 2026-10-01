export interface IBaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface IApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface IPaginationParams {
  page: number;
  limit: number;
}

export interface IPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IQueryOptions {
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export type IpcChannel = 
  | 'window:minimize'
  | 'window:maximize'
  | 'window:close';

export interface IWindowConfig {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  title?: string;
  resizable?: boolean;
  frame?: boolean;
  backgroundColor?: string;
}
