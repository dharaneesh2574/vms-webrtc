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
  // Additional properties for device management
  ip?: string;
  port?: number;
  protocol?: string;
  connected?: boolean;
  groupName?: string;
  username?: string;
  password?: string;
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

export interface EventLog {
  id: string;
  timestamp: string;
  type?: 'screenshot' | 'recording' | 'alert' | 'system';
  cameraId?: string;
  cameraName?: string;
  description: string;
  mediaUrl?: string;
  priority?: AlertPriority;
  // Additional properties used in the codebase
  eventType?: 'screenshot' | 'recording' | 'alert' | 'system';
  eventName?: string;
}

export interface Ticket {
  id: string;
  title?: string;
  description?: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority?: AlertPriority;
  assignedTo?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  cameraId?: string;
  cameraName?: string;
  attachments?: string[];
  // Additional properties used in the codebase
  eventId?: string;
  eventType?: 'screenshot' | 'recording';
  eventName?: string;
  mediaUrl?: string;
  timestamp?: string;
  assignedFrom?: string;
}