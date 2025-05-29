import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Monitor from './Monitor';
import Playback from './Playback';
import DeviceManager from './DeviceManager';
import AlertBoxPage from './AlertBoxPage';
import Dashboard from '../components/Dashboard';
import RecordSettings from './RecordSettings';
import AlertSettings from './AlertSettings';
import UserAccessManagement from './UserAccessManagement';
import Tickets from './Tickets';
import { Camera } from '../types';
import { fetchDevices } from '../api/devices';

interface MainPageProps {
  setAuthenticated: (value: boolean) => void;
}

const MainPage: React.FC<MainPageProps> = ({ setAuthenticated }) => {
  console.log('MainPage rendered');
  const [layout, setLayout] = useState<string>('auto'); // Default to 'auto'
  const [selectedCameras, setSelectedCameras] = useState<Camera[]>([]);
  const [allCameras, setAllCameras] = useState<Camera[]>([]);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const devices = await fetchDevices();
        console.log('Fetched devices in MainPage:', devices);
        setAllCameras(devices);
      } catch (error) {
        console.error('Failed to fetch devices in MainPage:', error);
      }
    };
    loadDevices();
  }, []);

  const toggleCameraSelection = (camera: Camera) => {
    if (selectedCameras.some(cam => cam.id === camera.id)) {
      const newSelectedCameras = selectedCameras.filter(cam => cam.id !== camera.id);
      setSelectedCameras(newSelectedCameras);
      console.log('Camera deselected:', camera.id, 'New selectedCameras:', newSelectedCameras);
    } else {
      // Find the first available slot
      const usedSlots = new Set(selectedCameras.map(cam => cam.gridPosition));
      let nextSlot = 0;
      while (usedSlots.has(nextSlot)) {
        nextSlot++;
      }
      
      // Add camera with grid position
      const cameraWithPosition = {
        ...camera,
        gridPosition: nextSlot
      };
      setSelectedCameras([...selectedCameras, cameraWithPosition]);
      console.log('Camera selected:', camera.id, 'New selectedCameras:', [...selectedCameras, cameraWithPosition]);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar setAuthenticated={setAuthenticated} />
        <Routes>
          <Route
            path="/monitor"
            element={
              <div className="bg-gray-600 text-white p-4 flex justify-between items-center">
                <select
                  value={layout}
                  onChange={(e) => setLayout(e.target.value)}
                  className="px-3 py-2 border rounded bg-gray-700 text-white mr-4"
                >
                  <option value="auto">Auto</option>
                  <option value="1x1">1x1</option>
                  <option value="2x2">2x2</option>
                  <option value="3x3">3x3</option>
                </select>
                <div className="flex flex-col space-y-2">
                  <select
                    className="px-3 py-2 border rounded bg-gray-700 text-white appearance-none"
                    onChange={(e) => {
                      if (e.target.value === "select-all") {
                        if (selectedCameras.length === allCameras.length) {
                          // If all cameras are selected, deselect all
                          setSelectedCameras([]);
                        } else {
                          // Select all cameras
                          const newSelectedCameras = allCameras.map((camera, index) => ({
                            ...camera,
                            gridPosition: index
                          }));
                          setSelectedCameras(newSelectedCameras);
                        }
                      } else {
                        const camera = allCameras.find(cam => cam.id === e.target.value);
                        if (camera) toggleCameraSelection(camera);
                      }
                    }}
                    value=""
                  >
                    <option value="" disabled>Select a camera</option>
                    <option value="select-all">
                      {selectedCameras.length === allCameras.length ? 'Deselect All Cameras' : 'Select All Cameras'}
                    </option>
                    <option disabled>──────────</option>
                    {allCameras.map(camera => (
                      <option key={camera.id} value={camera.id}>
                        {camera.name || `Camera ${camera.id}`} {selectedCameras.some(cam => cam.id === camera.id) ? '✔' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            }
          />
          <Route path="*" element={null} />
        </Routes>
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route
              path="/monitor"
              element={
                <Monitor
                  selectedCameras={selectedCameras}
                  setSelectedCameras={setSelectedCameras}
                  layout={layout}
                  setLayout={setLayout}
                  allCameras={allCameras}
                />
              }
            />
            <Route path="/playback" element={<Playback />} />
            <Route path="/alertbox" element={<AlertBoxPage />} />
            <Route path="/dashboard" element={<Dashboard cameras={[]} alerts={[]} />} />
            <Route path="/tickets" element={<Tickets />} />
            
            {/* Configuration Routes */}
            <Route path="/configurations/device-manager" element={<DeviceManager />} />
            <Route path="/configurations/record-settings" element={<RecordSettings />} />
            <Route path="/configurations/alert-settings" element={<AlertSettings />} />
            <Route path="/configurations/user-access" element={<UserAccessManagement />} />
            
            <Route path="/" element={<Navigate to="/monitor" />} />
            <Route path="*" element={<Navigate to="/monitor" />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default MainPage;