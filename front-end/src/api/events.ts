import { EventLog } from '../types';

// Mock data for event logs
const mockEventLogs: EventLog[] = [
  {
    id: '1',
    eventType: 'screenshot',
    eventName: 'Movement Detected',
    timestamp: '2024-03-20T10:30:45.123Z',
    description: 'Motion detected in camera 1',
    mediaUrl: 'https://example.com/screenshots/camera1_20240320103045.jpg',
    priority: 'medium'
  },
  {
    id: '2',
    eventType: 'recording',
    eventName: 'Suspicious Activity',
    timestamp: '2024-03-20T10:25:30.456Z',
    description: 'Suspicious movement near entrance',
    mediaUrl: 'https://example.com/recordings/camera2_20240320102530.mp4',
    priority: 'medium'
  },
  {
    id: '3',
    eventType: 'screenshot',
    eventName: 'Line Breach',
    timestamp: '2024-03-20T10:15:20.789Z',
    description: 'Perimeter breach detected',
    mediaUrl: 'https://example.com/screenshots/camera3_20240320101520.jpg',
    priority: 'high'
  },
];

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchEventLogs = async (): Promise<EventLog[]> => {
  await delay(500); // Simulate network delay
  return mockEventLogs;
};

export const addEventLog = async (event: Omit<EventLog, 'id'>): Promise<EventLog> => {
  await delay(500);
  const newEvent = {
    ...event,
    id: Date.now().toString(),
  };
  mockEventLogs.unshift(newEvent);
  return newEvent;
};

export const updateEventLog = async (id: string, updates: Partial<EventLog>): Promise<EventLog> => {
  await delay(500);
  const index = mockEventLogs.findIndex(event => event.id === id);
  if (index === -1) {
    throw new Error('Event not found');
  }
  mockEventLogs[index] = { ...mockEventLogs[index], ...updates };
  return mockEventLogs[index];
};

export const deleteEventLog = async (id: string): Promise<void> => {
  await delay(500);
  const index = mockEventLogs.findIndex(event => event.id === id);
  if (index === -1) {
    throw new Error('Event not found');
  }
  mockEventLogs.splice(index, 1);
}; 