export interface MapError {
  type: 'webgl' | 'style' | 'data';
  title: string;
  message: string;
  details?: string;
}

export type MapLoadingStatus = 'idle' | 'loading' | 'ready' | 'error';
