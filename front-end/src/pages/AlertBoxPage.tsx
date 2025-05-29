import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faExclamationTriangle, faExclamationCircle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Alert } from '../types';
import { fetchAlerts } from '../api/alerts';

const AlertBoxPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await fetchAlerts();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === 'all') return true;
    return alert.priority === activeTab;
  });

  const getAlertCount = (priority: 'all' | 'high' | 'medium' | 'low') => {
    if (priority === 'all') return alerts.length;
    return alerts.filter(alert => alert.priority === priority).length;
  };

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return faExclamationTriangle;
      case 'medium':
        return faExclamationCircle;
      case 'low':
        return faInfoCircle;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      <div className="flex-1 flex flex-col gap-4 p-4 overflow-hidden">
        <div className="flex-1 flex flex-col bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gray-700 px-6 py-4">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span>All Alerts</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === 'all' ? 'bg-blue-500' : 'bg-gray-700'
                }`}>
                  {getAlertCount('all')}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('high')}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 ${
                  activeTab === 'high'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                <span>High Priority</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === 'high' ? 'bg-red-500' : 'bg-gray-700'
                }`}>
                  {getAlertCount('high')}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('medium')}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 ${
                  activeTab === 'medium'
                    ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/20'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <FontAwesomeIcon icon={faExclamationCircle} className="mr-1" />
                <span>Medium Priority</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === 'medium' ? 'bg-yellow-500' : 'bg-gray-700'
                }`}>
                  {getAlertCount('medium')}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('low')}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 ${
                  activeTab === 'low'
                    ? 'bg-green-600 text-white shadow-lg shadow-green-500/20'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
                <span>Low Priority</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === 'low' ? 'bg-green-500' : 'bg-gray-700'
                }`}>
                  {getAlertCount('low')}
                </span>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Camera
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Priority
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredAlerts.map((alert) => (
                  <tr key={alert.id} className="bg-gray-800 hover:bg-gray-700 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-200">{alert.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300">{alert.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{alert.cameraName || 'System'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{formatDate(alert.timestamp)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <FontAwesomeIcon 
                          icon={getPriorityIcon(alert.priority)} 
                          className={`${
                            alert.priority === 'high'
                              ? 'text-red-400'
                              : alert.priority === 'medium'
                              ? 'text-yellow-400'
                              : 'text-green-400'
                          }`}
                        />
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          alert.priority === 'high'
                            ? 'bg-red-900/50 text-red-200'
                            : alert.priority === 'medium'
                            ? 'bg-yellow-900/50 text-yellow-200'
                            : 'bg-green-900/50 text-green-200'
                        }`}>
                          {alert.priority}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertBoxPage;