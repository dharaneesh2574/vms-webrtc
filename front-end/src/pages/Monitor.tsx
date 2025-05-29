// src/pages/Monitor.tsx
import React from 'react';
import VideoWall from '../components/VideoWall';
import { Camera } from '../types';

interface MonitorProps {
  selectedCameras: Camera[];
  setSelectedCameras: React.Dispatch<React.SetStateAction<Camera[]>>;
  layout: string;
  setLayout: React.Dispatch<React.SetStateAction<string>>;
  allCameras: Camera[]; // Added to pass all available cameras
}

const Monitor: React.FC<MonitorProps> = ({ selectedCameras, setSelectedCameras, layout, setLayout, allCameras }) => {
  return (
    <div>
      <VideoWall
        allCameras={allCameras}
        selectedCameras={selectedCameras}
        setSelectedCameras={setSelectedCameras}
        layout={layout}
        onEventLog={(event) => console.log('Event logged:', event)} // Placeholder for event logging
      />
    </div>
  );
};

export default Monitor;