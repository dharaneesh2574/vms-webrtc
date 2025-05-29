// src/types.ts
// src/types.ts
export interface Camera {
  id: string;
  name: string;
  streamUrl: string;
  status: 'active' | 'inactive';
  audioEnabled: boolean;
  ptzSupported: boolean;
  health?: number;
  gridPosition?: number;
  onDemand?: boolean;
  disableAudio?: boolean;
  debug?: boolean;
}

export type AlertPriority = 'high' | 'medium' | 'low';

export interface Alert {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  priority: AlertPriority;
  cameraId?: string;
  cameraName?: string;
  isResolved?: boolean;
}