import React, { useState } from 'react';
import { Camera } from '../types';

interface PTZControlsProps {
  camera: Camera;
  onClose: () => void;
}

const PTZControls: React.FC<PTZControlsProps> = ({ camera, onClose }) => {
  const [speed, setSpeed] = useState<number>(50);

  const handlePTZ = (action: string) => {
    // Call API to send PTZ command (e.g., ONVIF PTZ Service)
    console.log(`PTZ ${action} for camera ${camera.id} at speed ${speed}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg">
        <h3 className="text-lg font-bold mb-4">PTZ Controls: {camera.name}</h3>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button onClick={() => handlePTZ('up-left')} className="bg-gray-300 p-2 rounded">↖</button>
          <button onClick={() => handlePTZ('up')} className="bg-gray-300 p-2 rounded">↑</button>
          <button onClick={() => handlePTZ('up-right')} className="bg-gray-300 p-2 rounded">↗</button>
          <button onClick={() => handlePTZ('left')} className="bg-gray-300 p-2 rounded">←</button>
          <button className="bg-gray-300 p-2 rounded" disabled>·</button>
          <button onClick={() => handlePTZ('right')} className="bg-gray-300 p-2 rounded">→</button>
          <button onClick={() => handlePTZ('down-left')} className="bg-gray-300 p-2 rounded">↙</button>
          <button onClick={() => handlePTZ('down')} className="bg-gray-300 p-2 rounded">↓</button>
          <button onClick={() => handlePTZ('down-right')} className="bg-gray-300 p-2 rounded">↘</button>
        </div>
        <div className="mb-4">
          <label className="block text-sm">Speed</label>
          <input
            type="range"
            min="0"
            max="100"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => handlePTZ('zoom-in')}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Zoom In
          </button>
          <button
            onClick={() => handlePTZ('zoom-out')}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Zoom Out
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PTZControls;
