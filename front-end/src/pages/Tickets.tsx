import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faTimes, faPlay } from '@fortawesome/free-solid-svg-icons';
import { getTickets, getInboxTickets, updateTicketStatus } from '../api/tickets';
import { Ticket } from '../types';

const Tickets: React.FC = () => {
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [inboxTickets, setInboxTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [mainTickets, inbox] = await Promise.all([
        getTickets(),
        getInboxTickets()
      ]);
      setTickets(mainTickets);
      setInboxTickets(inbox);
    } catch (err) {
      setError('Failed to load tickets. Please try again.');
      console.error('Error loading tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleDeleteTicket = async (ticketId: string, isInbox: boolean) => {
    try {
      // For now, we'll just update the UI since delete API isn't implemented
      if (isInbox) {
        setInboxTickets(inboxTickets.filter(ticket => ticket.id !== ticketId));
      } else {
        setTickets(tickets.filter(ticket => ticket.id !== ticketId));
      }
    } catch (err) {
      setError('Failed to delete ticket. Please try again.');
      console.error('Error deleting ticket:', err);
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    try {
      const updatedTicket = await updateTicketStatus(ticketId, 'closed');
      
      // Remove from inbox
      setInboxTickets(inboxTickets.filter(ticket => ticket.id !== ticketId));
      
      // Add to main tickets if it was in inbox
      const wasInInbox = inboxTickets.some(t => t.id === ticketId);
      if (wasInInbox) {
        setTickets([...tickets, updatedTicket]);
      } else {
        // Update status in main tickets
        setTickets(tickets.map(ticket => 
          ticket.id === ticketId ? { ...ticket, status: 'closed' } : ticket
        ));
      }
    } catch (err) {
      setError('Failed to close ticket. Please try again.');
      console.error('Error closing ticket:', err);
    }
  };

  const handleMediaClick = (mediaUrl: string) => {
    setSelectedMediaUrl(mediaUrl);
    setShowMediaModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-gray-300">Loading tickets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      <div className="flex-1 flex flex-col gap-4 p-4 overflow-hidden">
        {/* Tickets Section */}
        <div className="flex-1 flex flex-col bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gray-700 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Tickets</h2>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Event Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="bg-gray-800 hover:bg-gray-700 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleMediaClick(ticket.mediaUrl)}
                        className="text-blue-400 hover:text-blue-300 flex items-center"
                      >
                        <FontAwesomeIcon icon={faPlay} className="mr-2" />
                        {ticket.eventType === 'screenshot' ? 'Screenshot' : 'Recording'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-200">{ticket.eventName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{formatDate(ticket.timestamp)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{ticket.assignedTo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        ticket.status === 'open' ? 'bg-green-900 text-green-200' : 'bg-gray-900 text-gray-200'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-3">
                        {ticket.status === 'open' && (
                          <button
                            onClick={() => handleCloseTicket(ticket.id)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
                          >
                            Close
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTicket(ticket.id, false)}
                          className="text-red-400 hover:text-red-300 transition-colors duration-200"
                          title="Delete Ticket"
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

        {/* Inbox Section */}
        <div className="flex-1 flex flex-col bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gray-700 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Inbox</h2>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Event Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Assigned From
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {inboxTickets.map((ticket) => (
                  <tr key={ticket.id} className="bg-gray-800 hover:bg-gray-700 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleMediaClick(ticket.mediaUrl)}
                        className="text-blue-400 hover:text-blue-300 flex items-center"
                      >
                        <FontAwesomeIcon icon={faPlay} className="mr-2" />
                        {ticket.eventType === 'screenshot' ? 'Screenshot' : 'Recording'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-200">{ticket.eventName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{formatDate(ticket.timestamp)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{ticket.assignedFrom}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        ticket.status === 'open' ? 'bg-green-900 text-green-200' : 'bg-gray-900 text-gray-200'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-3">
                        {ticket.status === 'open' && (
                          <button
                            onClick={() => handleCloseTicket(ticket.id)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
                          >
                            Close
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTicket(ticket.id, true)}
                          className="text-red-400 hover:text-red-300 transition-colors duration-200"
                          title="Delete Ticket"
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
                <FontAwesomeIcon icon={faTimes} />
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
    </div>
  );
};

export default Tickets; 