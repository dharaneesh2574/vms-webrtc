import { Alert } from '../types';

// Mock data for alerts
const mockAlerts: Alert[] = [
  {
    id: '1',
    title: 'Motion Detected',
    description: 'Movement detected in camera 1',
    priority: 'high',
    timestamp: new Date().toISOString(),
    cameraName: 'Camera 1',
  },
  {
    id: '2',
    title: 'System Alert',
    description: 'Storage space running low',
    priority: 'medium',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    cameraName: 'System',
  },
  {
    id: '3',
    title: 'Camera Offline',
    description: 'Camera 3 connection lost',
    priority: 'low',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    cameraName: 'Camera 3',
  },
  {
    id: '4',
    title: 'Network Latency',
    description: 'High latency detected in camera 2',
    priority: 'low',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    cameraName: 'Camera 2',
  },
  {
    id: '5',
    title: 'Storage Warning',
    description: 'Storage usage at 80%',
    priority: 'low',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    cameraName: 'System',
  },
  {
    id: '6',
    title: 'Camera Reconnected',
    description: 'Camera 4 reconnected to network',
    priority: 'low',
    timestamp: new Date(Date.now() - 18000000).toISOString(),
    cameraName: 'Camera 4',
  },
  {
    id: '7',
    title: 'System Update',
    description: 'System update available',
    priority: 'low',
    timestamp: new Date(Date.now() - 21600000).toISOString(),
    cameraName: 'System',
  },
  {
    id: '8',
    title: 'Backup Complete',
    description: 'Daily backup completed successfully',
    priority: 'low',
    timestamp: new Date(Date.now() - 25200000).toISOString(),
    cameraName: 'System',
  }
];

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchAlerts = async (): Promise<Alert[]> => {
  await delay(500); // Simulate network delay
  return mockAlerts;
};

export const createAlert = async (alert: Omit<Alert, 'id' | 'timestamp'>): Promise<Alert> => {
  await delay(500);
  const newAlert: Alert = {
    ...alert,
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
  };
  mockAlerts.unshift(newAlert);
  return newAlert;
}; 