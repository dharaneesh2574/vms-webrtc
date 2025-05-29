import React, { useState } from 'react';
import { Camera } from '../types';
import { addDevice, removeDevice, updateDevice } from '../api/devices';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';

interface DeviceTableProps {
  availableDevices: Camera[];
  managedDevices: Camera[];
  refreshDevices: () => void;
}

const DeviceTable: React.FC<DeviceTableProps> = ({
  availableDevices,
  managedDevices,
  refreshDevices,
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedDevice, setSelectedDevice] = useState<Camera | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    username: string;
    password: string;
    groupName: string;
  }>({ name: '', username: '', password: '', groupName: '' });

  const handleAdd = async () => {
    try {
      await addDevice({ ...selectedDevice!, ...formData });
      refreshDevices();
      setShowAddModal(false);
      setFormData({ name: '', username: '', password: '', groupName: '' });
    } catch (error) {
      console.error('Failed to add device', error);
    }
  };

  const handleEdit = async () => {
    try {
      await updateDevice(selectedDevice!.id, formData);
      refreshDevices();
      setShowEditModal(false);
      setFormData({ name: '', username: '', password: '', groupName: '' });
    } catch (error) {
      console.error('Failed to edit device', error);
    }
  };

  const handleRemove = async (id: string) => {
    if (window.confirm('Remove this device?')) {
      try {
        await removeDevice(id);
        refreshDevices();
      } catch (error) {
        console.error('Failed to remove device', error);
      }
    }
  };

  return (
    <div className="p-4 text-gray-100">
      <h2 className="text-xl font-bold mb-4 text-gray-100">Available Devices</h2>
      <table className="w-full border-collapse mb-8">
        <thead>
          <tr className="bg-gray-700">
            <th className="border border-gray-600 p-2 text-left">IP/Port</th>
            <th className="border border-gray-600 p-2 text-left">Protocol/Standard</th>
            <th className="border border-gray-600 p-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {availableDevices.map((device) => (
            <tr key={device.id} className="hover:bg-gray-700">
              <td className="border border-gray-600 p-2">{device.ip}:{device.port}</td>
              <td className="border border-gray-600 p-2">{device.protocol}</td>
              <td className="border border-gray-600 p-2">
                <button
                  onClick={() => {
                    setSelectedDevice(device);
                    setShowAddModal(true);
                  }}
                  className="flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-xl font-bold mb-4 text-gray-100">Managed Devices</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-700">
            <th className="border border-gray-600 p-2 text-left">Name</th>
            <th className="border border-gray-600 p-2 text-left">IP/Port</th>
            <th className="border border-gray-600 p-2 text-left">Protocol/Standard</th>
            <th className="border border-gray-600 p-2 text-left">Connected</th>
            <th className="border border-gray-600 p-2 text-left">Group Name</th>
            <th className="border border-gray-600 p-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {managedDevices.map((device) => (
            <tr key={device.id} className="hover:bg-gray-700">
              <td className="border border-gray-600 p-2">{device.name}</td>
              <td className="border border-gray-600 p-2">{device.ip}:{device.port}</td>
              <td className="border border-gray-600 p-2">{device.protocol}</td>
              <td className="border border-gray-600 p-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  device.connected ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                }`}>
                  {device.connected ? 'Connected' : 'Disconnected'}
                </span>
              </td>
              <td className="border border-gray-600 p-2">{device.groupName}</td>
              <td className="border border-gray-600 p-2">
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedDevice(device);
                      setFormData({
                        name: device.name,
                        username: '',
                        password: '',
                        groupName: device.groupName,
                      });
                      setShowEditModal(true);
                    }}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                    title="Edit Device"
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button
                    onClick={() => handleRemove(device.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                    title="Remove Device"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800/95 p-6 rounded-lg w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-gray-100">Add Device</h3>
            <div className="mb-4">
              <label className="block text-sm text-gray-300">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-300">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-300">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-300">Group Name</label>
              <input
                type="text"
                value={formData.groupName}
                onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Device Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800/95 p-6 rounded-lg w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-gray-100">Edit Device</h3>
            <div className="mb-4">
              <label className="block text-sm text-gray-300">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-300">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-300">Group Name</label>
              <input
                type="text"
                value={formData.groupName}
                onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceTable;