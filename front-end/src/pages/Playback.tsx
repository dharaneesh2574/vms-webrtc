import React, { useEffect, useState, useRef } from 'react';
import { Camera } from '../types'; // Assuming you have a Camera type defined in types.ts
import { fetchDevices } from '../api/devices'; // Assuming fetchDevices is exported from devices.ts
import { addEventLog } from '../api/events';
import PlaybackControls from '../components/playback/PlaybackControls';
import Timeline from '../components/playback/Timeline';
import VideoPlayer from '../components/playback/VideoPlayer'; // Import VideoPlayer
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';
import { 
  faChevronLeft, 
  faChevronRight,
  faPlay,
  faPause,
  faCamera,
  faVideo,
  faForwardStep,
  faBackwardStep,
  faVolumeHigh,
  faVideoCamera
} from '@fortawesome/free-solid-svg-icons';

// Calculate the number of columns for a near-square grid
const getGridCols = (count: number) => {
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-2';
  if (count <= 4) return 'grid-cols-2';
  if (count <= 6) return 'grid-cols-3';
  if (count <= 9) return 'grid-cols-3';
  if (count <= 12) return 'grid-cols-4';
  // For more than 12, keep adding columns as needed
  return `grid-cols-${Math.ceil(Math.sqrt(count))}`;
};

const Playback: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameras, setSelectedCameras] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();

  // States for playback (to be managed globally or per video player later)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const [volume, setVolume] = useState(0.5); // Start with a sensible volume, not 1 (max)
  const [currentTime, setCurrentTime] = useState(0); // in seconds
  const [totalTime, setTotalTime] = useState(0); // Will be updated by the video player

  // Ref for the primary video player to control it (e.g., for seeking)
  // This simplistic approach controls the first selected video. 
  // For multiple videos, you'd need an array of refs or a more complex state.
  const primaryVideoRef = useRef<HTMLVideoElement>(null);

  // Height of the controls bar (should match the actual height in px)
  const controlsBarHeight = 104; // px (adjust if needed)

  useEffect(() => {
    const loadCameras = async () => {
      const devices = await fetchDevices();
      setCameras(devices);
      // Automatically select the first camera if available for demo purposes
      if (devices.length > 0) {
        // setSelectedCameras([devices[0].id]);
      }
    };
    loadCameras();
  }, []);

  const toggleCameraSelection = (cameraId: string) => {
    setSelectedCameras(prevSelectedCameras =>
      prevSelectedCameras.includes(cameraId)
        ? prevSelectedCameras.filter(id => id !== cameraId)
        : [...prevSelectedCameras, cameraId]
    );
    // Reset playback state when selection changes for simplicity
    setIsPlaying(false);
    setCurrentTime(0);
    // setTotalTime(0); // Total time will be set by the new video loading
  };

  // Placeholder handlers for playback controls
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleSpeedChange = (speed: number) => setCurrentSpeed(speed);
  const handleVolumeChange = (vol: number) => setVolume(vol);
  
  const handleSeek = (time: number) => {
    if (primaryVideoRef.current) {
      primaryVideoRef.current.currentTime = time;
    }
    setCurrentTime(time); // Also update our state
  };

  // Callback for VideoPlayer to update current time and total time
  const handleTimeUpdate = (current: number, total: number) => {
    setCurrentTime(current);
    if (total && totalTime !== total) { // Set totalTime if it's different and valid
        setTotalTime(total);
    }
  };

  const handleLoadedData = (total: number) => {
    setTotalTime(total);
    // Optional: if you want to auto-play when a new video is loaded and selected
    // if(selectedCameras.length > 0) setIsPlaying(true);
  };

  // Updated event logging handler to use the API
  const handleEventLog = async (event: {
    type: 'screenshot' | 'recording';
    cameraId: string;
    mediaUrl: string;
  }) => {
    try {
      // Create the new event with the API
      const newEvent = await addEventLog({
        eventType: event.type,
        eventName: `${event.type === 'screenshot' ? 'Screenshot' : 'Recording'} from Playback`,
        timestamp: new Date().toISOString(),
        description: `${event.type === 'screenshot' ? 'Screenshot' : 'Recording'} taken from camera ${event.cameraId} in playback mode`,
        mediaUrl: event.mediaUrl,
        priority: 'low' // Default priority for playback events
      });

      // Navigate to Event-logs page with the new event data
      navigate('/event-logs', {
        state: {
          newEvent
        },
      });
    } catch (error) {
      console.error('Failed to add event log:', error);
      // You might want to show a notification to the user here
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Content Area (now comes first) */}
        <div className="flex-1 flex flex-col relative">
          <div className="p-4 pb-0 flex items-center">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded border border-gray-700"
                title="Open Camera Selection"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
            )}
          </div>
          {/* Camera grid area is scrollable, timeline is fixed below */}
          <div
            className={`flex-1 overflow-y-auto p-0 grid gap-0 ${getGridCols(selectedCameras.length)}`}
            style={{ marginBottom: `${controlsBarHeight}px` }}
          >
            {selectedCameras.map((cameraId, index) => {
              const camera = cameras.find(c => c.id === cameraId);
              if (!camera) return null;
              return (
                <div key={cameraId} className="border border-gray-700 bg-black aspect-video flex flex-col">
                  <h4 className="font-semibold text-xs text-white bg-black bg-opacity-50 p-1 truncate">{camera.name || `Camera ${camera.id}`}</h4>
                  <div className="flex-1">
                    <VideoPlayer
                      streamUrl={camera.streamUrl}
                      isPlaying={isPlaying}
                      volume={volume}
                      playbackSpeed={currentSpeed}
                      currentTime={currentTime}
                      cameraId={camera.id}
                      onTimeUpdate={index === 0 ? handleTimeUpdate : undefined}
                      onLoadedData={index === 0 ? handleLoadedData : undefined}
                      onEventLog={handleEventLog}
                    />
                  </div>
                </div>
              );
            })}
            {selectedCameras.length === 0 && (
              <p className="p-4">Select cameras from the sidebar to view playback.</p>
            )}
          </div>
          {/* Fixed Playback Controls and Timeline at the bottom of the main content area */}
          {selectedCameras.length > 0 && (
            <div
              className="absolute left-0 right-0 bottom-0 bg-gray-900 border-t border-gray-700 p-2 z-30 shadow-lg"
              style={{ height: `${controlsBarHeight}px` }}
            >
              <PlaybackControls
                isPlaying={isPlaying}
                currentSpeed={currentSpeed}
                volume={volume}
                onPlay={handlePlay}
                onPause={handlePause}
                onSpeedChange={handleSpeedChange}
                onVolumeChange={handleVolumeChange}
              />
              <Timeline
                currentTime={currentTime}
                totalTime={totalTime}
                onSeek={handleSeek}
              />
            </div>
          )}
        </div>
        {/* Sidebar on the right */}
        {isSidebarOpen && (
          <div className="w-64 bg-gray-800 p-4 overflow-y-auto flex-shrink-0 relative border-l border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <FontAwesomeIcon icon={faVideoCamera} className="text-gray-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">Cameras</h3>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
                title="Close Camera Selection"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
            <ul>
              {cameras.map(camera => (
                <li key={camera.id} className="mb-2">
                  <label className="flex items-center space-x-3 hover:bg-gray-700 p-2 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCameras.includes(camera.id)}
                      onChange={() => toggleCameraSelection(camera.id)}
                      className="accent-blue-500"
                    />
                    <FontAwesomeIcon icon={faVideoCamera} className="text-gray-400" />
                    <span className="text-white">{camera.name || `Camera ${camera.id}`}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Playback;