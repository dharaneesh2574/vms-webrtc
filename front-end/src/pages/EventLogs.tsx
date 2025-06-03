import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faPlay, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useLocation } from 'react-router-dom';
import { fetchEventLogs, addEventLog, updateEventLog, deleteEventLog } from '../api/events';
import { createTicket } from '../api/tickets';
import { EventLog } from '../types';
import CreateTicketModal from '../components/CreateTicketModal';

const EventLogs: React.FC = () => {
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventLog | null>(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const location = useLocation();

  const predefinedEvents = [
    'Movement Detected',
    'Suspicious Activity',
    'Line Breach',
    'Unauthorized Entry',
    'Custom Event'
  ];

  useEffect(() => {
    loadEventLogs();
  }, []);

  useEffect(() => {
    // Handle new event from navigation state
    const newEvent = location.state?.newEvent;
    if (newEvent) {
      setSelectedEvent(newEvent);
      setShowEventForm(true);
    }
  }, [location.state]);

  // Clear notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadEventLogs = async () => {
    try {
      setIsLoading(true);
      const logs = await fetchEventLogs();
      setEventLogs(logs);
    } catch (error) {
      console.error('Failed to load event logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMediaClick = (mediaUrl: string) => {
    setSelectedMediaUrl(mediaUrl);
    setShowMediaModal(true);
  };

  const handleEdit = (event: EventLog) => {
    setSelectedEvent(event);
    setShowEventForm(true);
  };

  const handleDelete = async (eventId: string) => {
    try {
      await deleteEventLog(eventId);
      await loadEventLogs();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handleCreateTicket = (event: EventLog) => {
    setSelectedEvent(event);
    setIsCreateTicketModalOpen(true);
  };

  const handleTicketSubmit = async (ticketData: {
    eventId: string;
    eventName: string;
    eventType: 'screenshot' | 'recording';
    mediaUrl: string;
    timestamp: string;
    assignedTo: string;
  }) => {
    try {
      const newTicket = await createTicket({
        eventId: ticketData.eventId,
        eventName: ticketData.eventName,
        eventType: ticketData.eventType,
        mediaUrl: ticketData.mediaUrl,
        timestamp: ticketData.timestamp,
        assignedTo: ticketData.assignedTo
      });
      
      setNotification({
        message: `Ticket created successfully - assigned to ${ticketData.assignedTo} and added to their inbox`,
        type: 'success'
      });
      setIsCreateTicketModalOpen(false);
    } catch (error) {
      setNotification({
        message: 'Failed to create ticket. Please try again.',
        type: 'error'
      });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const eventName = formData.get('eventName') as string;
    const description = formData.get('description') as string;

    try {
      if (selectedEvent) {
        // Update existing event
        await updateEventLog(selectedEvent.id, {
          eventName,
          description,
        });
      } else {
        // Add new event
        await addEventLog({
          eventType: 'screenshot', // Default type for new events
          eventName,
          description,
          timestamp: new Date().toISOString(),
          mediaUrl: '', // This should be set when capturing media
          priority: 'low' // Default priority
        });
      }
      await loadEventLogs();
      setShowEventForm(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-xl text-white">Loading event logs...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-900 relative">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center px-4 py-2 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          <FontAwesomeIcon
            icon={notification.type === 'success' ? faCheck : faXmark}
            className="mr-2"
          />
          <span className="text-white">{notification.message}</span>
        </div>
      )}

      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4 text-white">Event Logs</h2>
        
        {/* Event Logs Table */}
        <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Event</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Event Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {eventLogs.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {event.mediaUrl && (
                        <button
                          onClick={() => handleMediaClick(event.mediaUrl!)}
                          className="text-blue-400 hover:text-blue-600 underline"
                        >
                          {event.eventType === 'screenshot' ? 'Screenshot' : 'Recording'}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">{event.eventName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-gray-300">{event.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleCreateTicket(event)}
                          className="text-blue-400 hover:text-blue-300"
                          title="Create Ticket"
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </button>
                        <button
                          onClick={() => handleEdit(event)}
                          className="text-blue-400 hover:text-blue-300"
                          title="Edit"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="text-red-400 hover:text-red-300"
                          title="Delete"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Media Preview Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800/95 p-4 rounded-lg max-w-4xl w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Media Preview</h3>
              <button
                onClick={() => setShowMediaModal(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                ×
              </button>
            </div>
            <div className="aspect-video bg-black">
              {selectedMediaUrl.endsWith('.jpg') || selectedMediaUrl.endsWith('.png') ? (
                <img src={selectedMediaUrl} alt="Event Screenshot" className="w-full h-full object-contain" />
              ) : (
                <video src={selectedMediaUrl} controls className="w-full h-full" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800/95 p-6 rounded-lg w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-white">
              {selectedEvent ? 'Edit Event' : 'Add Event'}
            </h3>
            <form onSubmit={handleFormSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-300">Event Type</label>
                <select
                  name="eventType"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={selectedEvent?.eventType || ''}
                  required
                >
                  <option value="">Select event type</option>
                  <option value="screenshot">Screenshot</option>
                  <option value="recording">Recording</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-300">Event Name</label>
                <select
                  name="eventName"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={selectedEvent?.eventName || ''}
                  required
                >
                  <option value="">Select an event</option>
                  {predefinedEvents.map((event) => (
                    <option key={event} value={event}>
                      {event}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-300">Description</label>
                <textarea
                  name="description"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  defaultValue={selectedEvent?.description || ''}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEventForm(false);
                    setSelectedEvent(null);
                  }}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {selectedEvent ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEvent && (
        <CreateTicketModal
          isOpen={isCreateTicketModalOpen}
          onClose={() => setIsCreateTicketModalOpen(false)}
          onSubmit={handleTicketSubmit}
          eventData={{
            id: selectedEvent.id,
            eventName: selectedEvent.eventName,
            eventType: selectedEvent.eventType,
            mediaUrl: selectedEvent.mediaUrl,
            timestamp: selectedEvent.timestamp,
          }}
        />
      )}
    </div>
  );
};

export default EventLogs; 