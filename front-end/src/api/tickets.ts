import { Ticket } from '../types';

// Mock data
let mockTickets: Ticket[] = [
  {
    id: '1',
    eventId: 'evt1',
    eventName: 'Suspicious Activity',
    eventType: 'recording',
    mediaUrl: 'recording1.mp4',
    timestamp: '2024-03-20T10:30:00Z',
    assignedTo: 'John Doe',
    status: 'open'
  },
  {
    id: '2',
    eventId: 'evt2',
    eventName: 'Motion Detected',
    eventType: 'screenshot',
    mediaUrl: 'screenshot1.jpg',
    timestamp: '2024-03-20T09:15:00Z',
    assignedTo: 'Jane Smith',
    status: 'closed'
  }
];

let mockInboxTickets: Ticket[] = [
  {
    id: '3',
    eventId: 'evt3',
    eventName: 'Line Breach',
    eventType: 'recording',
    mediaUrl: 'recording2.mp4',
    timestamp: '2024-03-20T11:45:00Z',
    assignedFrom: 'Admin',
    status: 'open'
  }
];

// Get all tickets (including both assigned and inbox)
export const getTickets = async (): Promise<Ticket[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...mockTickets];
};

// Get only inbox tickets (assigned to current user)
export const getInboxTickets = async (): Promise<Ticket[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...mockInboxTickets];
};

// Create a new ticket
export const createTicket = async (ticketData: Omit<Ticket, 'id' | 'status'>): Promise<Ticket> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const newTicket: Ticket = {
    id: `ticket-${Date.now()}`,
    ...ticketData,
    status: 'open'
  };

  // Add to main tickets if assignedTo is specified
  if (ticketData.assignedTo) {
    mockTickets.push(newTicket);
    
    // Also create an inbox ticket for the assigned user
    const inboxTicket: Ticket = {
      ...newTicket,
      id: `ticket-inbox-${Date.now()}`,
      assignedFrom: 'System', // Or could be the current user's name
      assignedTo: undefined // Clear assignedTo for inbox ticket
    };
    mockInboxTickets.push(inboxTicket);
  }
  
  return newTicket;
};

// Update ticket status
export const updateTicketStatus = async (ticketId: string, status: 'open' | 'closed'): Promise<Ticket> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Check inbox tickets first
  let ticket = mockInboxTickets.find(t => t.id === ticketId);
  if (ticket) {
    ticket.status = status;
    if (status === 'closed') {
      // Move from inbox to main tickets when closed
      mockTickets.push({ ...ticket });
      mockInboxTickets = mockInboxTickets.filter(t => t.id !== ticketId);
    }
    return ticket;
  }
  
  // Check main tickets
  ticket = mockTickets.find(t => t.id === ticketId);
  if (!ticket) {
    throw new Error('Ticket not found');
  }
  
  ticket.status = status;
  return ticket;
};

// Delete a ticket
export const deleteTicket = async (ticketId: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Try to delete from both arrays
  mockTickets = mockTickets.filter(t => t.id !== ticketId);
  mockInboxTickets = mockInboxTickets.filter(t => t.id !== ticketId);
}; 