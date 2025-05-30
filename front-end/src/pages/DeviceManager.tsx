// src/pages/DeviceManager.tsx
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faPlus, faTrash, faEdit, faVolumeUp, faVolumeMute, faVideo, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { Camera } from '../types';
import { fetchDevices, addDevice, removeDevice, updateDevice } from '../api/devices';

const DeviceManager: React.FC = () => {
  const [devices, setDevices] = useState<Camera[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Camera | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    streamUrl: '',
    onDemand: true,
    disableAudio: true,
    debug: false,
  });

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const loadDevices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedDevices = await fetchDevices();
      setDevices(fetchedDevices);
    } catch (err) {
      setError('Failed to load devices. Please try again.');
      console.error('Error loading devices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      const newDevice = await addDevice({
        name: formData.name,
        url: formData.streamUrl,
        on_demand: formData.onDemand,
        disable_audio: formData.disableAudio,
        debug: formData.debug,
      });
      
      // Immediately update local state and refresh from server
      setDevices([...devices, newDevice]);
      await loadDevices(); // Refresh to get latest server state
      
      setShowAddModal(false);
      setFormData({ name: '', streamUrl: '', onDemand: true, disableAudio: true, debug: false });
      showSuccess(`Stream "${formData.name}" added successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add device');
      console.error('Error adding device:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice) return;

    try {
      setIsLoading(true);
      setError(null);
      const updatedDevice = await updateDevice(selectedDevice.id, {
        name: formData.name,
        streamUrl: formData.streamUrl,
        on_demand: formData.onDemand,
        disable_audio: formData.disableAudio,
        debug: formData.debug,
      });
      
      // Immediately update local state and refresh from server
      setDevices(devices.map(d => d.id === updatedDevice.id ? updatedDevice : d));
      await loadDevices(); // Refresh to get latest server state
      
      setShowEditModal(false);
      setSelectedDevice(null);
      setFormData({ name: '', streamUrl: '', onDemand: true, disableAudio: true, debug: false });
      showSuccess(`Stream "${formData.name}" updated successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update device');
      console.error('Error updating device:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDevice = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      await removeDevice(id);
      
      // Immediately update local state and refresh from server
      setDevices(devices.filter(d => d.id !== id));
      await loadDevices(); // Refresh to get latest server state
      
      showSuccess(`Stream "${name}" deleted successfully!`);
    } catch (err) {
      setError('Failed to delete device');
      console.error('Error deleting device:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (device: Camera) => {
    setSelectedDevice(device);
    setFormData({
      name: device.name,
      streamUrl: device.streamUrl,
      onDemand: device.onDemand ?? true,
      disableAudio: device.disableAudio ?? true,
      debug: device.debug ?? false,
    });
    setShowEditModal(true);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 bg-white dark:bg-gray-800 shadow-md">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">RTSP Stream Manager</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={isLoading}
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Add Stream
            </button>
            <button
              onClick={loadDevices}
              className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              disabled={isLoading}
            >
              <FontAwesomeIcon 
                icon={faSync} 
                className={`mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
              <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
              {successMessage}
            </div>
          )}

          {/* Devices Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Camera Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    RTSP URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Features
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Health
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {devices.map((device) => (
                  <tr key={device.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {device.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {device.streamUrl}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <span className={`inline-flex items-center ${!device.disableAudio ? 'text-green-500' : 'text-gray-400'}`}>
                          <FontAwesomeIcon icon={!device.disableAudio ? faVolumeUp : faVolumeMute} title="Audio" />
                        </span>
                        <span className={`inline-flex items-center ${device.ptzSupported ? 'text-green-500' : 'text-gray-400'}`}>
                          <FontAwesomeIcon icon={faVideo} title="PTZ Support" />
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                          <div 
                            className="bg-green-600 h-2.5 rounded-full" 
                            style={{ width: `${device.health ?? 100}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-300">
                          {device.health ?? 100}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => startEdit(device)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          onClick={() => handleDeleteDevice(device.id, device.name)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
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

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              {showAddModal ? 'Add New Stream' : 'Edit Stream'}
            </h2>
            <form onSubmit={showAddModal ? handleAddDevice : handleEditDevice}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Camera Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    RTSP URL
                  </label>
                  <input
                    type="text"
                    value={formData.streamUrl}
                    onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
                    placeholder="rtsp://username:password@ip:port/stream"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.onDemand}
                      onChange={(e) => setFormData({ ...formData, onDemand: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">On Demand</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.disableAudio}
                      onChange={(e) => setFormData({ ...formData, disableAudio: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Disable Audio</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.debug}
                      onChange={(e) => setFormData({ ...formData, debug: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Debug</span>
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedDevice(null);
                    setFormData({ name: '', streamUrl: '', onDemand: true, disableAudio: true, debug: false });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : showAddModal ? 'Add Stream' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManager;