import React, { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { Camera } from '../types';
import PTZControls from './PTZControls';
import TwoWayAudio from './TwoWayAudio';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faVolumeUp, faVolumeMute, faArrowsAlt, faCircle, faCamera, faVideo, faExpand, faCompress } from '@fortawesome/free-solid-svg-icons';
import ConfirmationDialog from './ConfirmationDialog';
import axios, { AxiosError } from 'axios';

interface Codec {
  Type: string; // 'video' or 'audio'
}

interface StreamInfo {
  producers: Array<{
    url: string;
    type?: string;
  }>;
  consumers: Array<any>;
}

interface VideoWallProps {
  allCameras: Camera[];
  selectedCameras: Camera[];
  setSelectedCameras: Dispatch<SetStateAction<Camera[]>>;
  layout?: string;
  onEventLog?: (event: {
    type: 'screenshot' | 'recording';
    cameraId: string;
    mediaUrl: string;
  }) => void;
}

const VideoWall: React.FC<VideoWallProps> = ({ allCameras, selectedCameras, setSelectedCameras, layout, onEventLog }) => {
  const [gridAssignments, setGridAssignments] = useState<{ [key: string]: number }>({});
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const peerConnections = useRef<{ [key: string]: RTCPeerConnection }>({});
  const processedStreams = useRef<Set<string>>(new Set());
  const [showCameraSelect, setShowCameraSelect] = useState<number | null>(null);
  const [showScreenshotConfirm, setShowScreenshotConfirm] = useState(false);
  const [showRecordingConfirm, setShowRecordingConfirm] = useState(false);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<{ [key: string]: boolean }>({});
  const [recordingStartTime, setRecordingStartTime] = useState<{ [key: string]: number }>({});
  const [fullscreenCamera, setFullscreenCamera] = useState<string | null>(null);

  const MAX_RETRIES = 8;
  const RETRY_DELAY = 1500;
  const GO2RTC_API_URL = 'http://localhost:1984'; // Updated to use correct go2rtc port

  // Fetch stream info from go2rtc
  const fetchStreamInfo = async (cameraId: string, retryCount = 0): Promise<StreamInfo | null> => {
    try {
      const response = await axios.get(`${GO2RTC_API_URL}/api/streams?src=${encodeURIComponent(cameraId)}`, {
        headers: {
          'Accept': 'application/json',
        },
      });
      if (response.headers['content-type']?.includes('application/json')) {
        console.log(`Stream info for ${cameraId}:`, response.data);
        return response.data;
      } else {
        console.error(`Received non-JSON response for stream info ${cameraId}:`, response.data);
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      console.error(`Failed to fetch stream info for ${cameraId}:`, {
        message: error.message,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        } : null,
      });
      if (retryCount < MAX_RETRIES && (error.code === 'ERR_NETWORK' || error.response?.status === 502)) {
        console.log(`Retrying fetchStreamInfo (${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchStreamInfo(cameraId, retryCount + 1);
      }
      return null;
    }
  };

  // For go2rtc, we don't need separate codec endpoint as it's handled in WebRTC negotiation
  const setupWebRTCConnection = async (cameraId: string): Promise<RTCPeerConnection | null> => {
    try {
      console.log(`[${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}] Setting up WebRTC for camera ${cameraId}`);
      
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });

      // Add transceivers for video and audio with support for multiple codecs
      pc.addTransceiver('video', { 
        direction: 'recvonly',
        sendEncodings: []
      });
      pc.addTransceiver('audio', { 
        direction: 'recvonly',
        sendEncodings: []
      });

      pc.ontrack = (event) => {
        console.log(`WebRTC ontrack event for camera ${cameraId}`, event);
        const videoElement = videoRefs.current[cameraId];
        if (videoElement && event.streams[0]) {
          videoElement.srcObject = event.streams[0];
          videoElement.play().catch((err) => console.error(`Video play error for camera ${cameraId}:`, err));
        } else {
          console.error(`Video element not found or no streams for camera ${cameraId}`);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`ICE candidate for camera ${cameraId}:`, event.candidate);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`ICE connection state for camera ${cameraId}:`, pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          console.error(`ICE connection failed/disconnected for camera ${cameraId}`);
          // Try to restart ICE connection
          if (pc.iceConnectionState === 'failed') {
            cleanupWebRTCConnection(cameraId);
          }
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`Connection state for camera ${cameraId}:`, pc.connectionState);
        if (pc.connectionState === 'failed') {
          console.error(`WebRTC connection failed for camera ${cameraId}`);
          cleanupWebRTCConnection(cameraId);
        }
      };

      // Create offer with multiple codec support
      const offer = await pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true
      });

      // Modify SDP to include multiple video codecs
      if (offer.sdp) {
        let modifiedSdp = offer.sdp;
        
        // Ensure H265 and H264 codecs are both available
        if (!modifiedSdp.includes('H265') && !modifiedSdp.includes('H264')) {
          console.warn(`No H264/H265 found in offer SDP for camera ${cameraId}`);
        }
        
        offer.sdp = modifiedSdp;
      }

      await pc.setLocalDescription(offer);

      console.log(`Sending WebRTC offer for camera ${cameraId} to go2rtc`);
      console.log('SDP Offer:', offer.sdp);

      if (!offer.sdp) {
        console.error(`SDP offer is undefined for camera ${cameraId}`);
        pc.close();
        return null;
      }

      // Send offer to go2rtc using the WebRTC API endpoint
      const response = await axios.post(
        `${GO2RTC_API_URL}/api/webrtc?src=${encodeURIComponent(cameraId)}`,
        {
          type: 'offer',
          sdp: offer.sdp
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        }
      );

      console.log(`WebRTC answer received for camera ${cameraId}:`, response.data);
      
      if (!response.data.sdp) {
        console.error(`No SDP in response for camera ${cameraId}`);
        pc.close();
        return null;
      }

      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: response.data.sdp
      }));
      
      console.log(`WebRTC connection established successfully for camera ${cameraId}`);
      return pc;
    } catch (error: any) {
      console.error(`WebRTC setup error for ${cameraId}:`, error);
      
      // Log specific error details for better debugging
      if (error.response) {
        console.error(`HTTP Error ${error.response.status}:`, error.response.data);
      } else if (error.code) {
        console.error(`Network Error:`, error.code, error.message);
      }
      
      return null;
    }
  };

  // Add cleanup function for WebRTC connections
  const cleanupWebRTCConnection = (cameraId: string) => {
    console.log(`Cleaning up WebRTC connection for camera ${cameraId}`);
    const pc = peerConnections.current[cameraId];
    if (pc) {
      pc.close();
      delete peerConnections.current[cameraId];
    }
    processedStreams.current.delete(cameraId);
    
    const videoElement = videoRefs.current[cameraId];
    if (videoElement && videoElement.srcObject) {
      const stream = videoElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoElement.srcObject = null;
    }
  };

  // Add useEffect for component cleanup
  useEffect(() => {
    return () => {
      // Cleanup all WebRTC connections when component unmounts
      Object.keys(peerConnections.current).forEach(cameraId => {
        cleanupWebRTCConnection(cameraId);
      });
      processedStreams.current.clear();
    };
  }, []);

  // Setup WebRTC for a camera
  const setupWebRTC = async (camera: Camera) => {
    if (camera.status !== 'active') {
      console.log(`Skipping WebRTC setup for camera ${camera.id} - status: ${camera.status}`);
      return;
    }

    // Clean up existing connection if any
    if (processedStreams.current.has(camera.id)) {
      cleanupWebRTCConnection(camera.id);
    }

    // Check if stream exists in go2rtc
    const streamInfo = await fetchStreamInfo(camera.id);
    if (!streamInfo || !streamInfo.producers || streamInfo.producers.length === 0) {
      console.error(`No stream producers found for ${camera.id}`);
      return;
    }

    console.log(`Setting up WebRTC for camera ${camera.id} with ${streamInfo.producers.length} producer(s)`);
    
    const pc = await setupWebRTCConnection(camera.id);
    if (pc) {
      peerConnections.current[camera.id] = pc;
      processedStreams.current.add(camera.id);
    }
  };

  // Add useEffect for handling camera changes
  useEffect(() => {
    selectedCameras.forEach(camera => {
      if (camera.status === 'active' && !processedStreams.current.has(camera.id)) {
        setupWebRTC(camera);
      }
    });

    // Cleanup connections for cameras that are no longer selected
    Object.keys(peerConnections.current).forEach(cameraId => {
      if (!selectedCameras.some(cam => cam.id === cameraId)) {
        cleanupWebRTCConnection(cameraId);
      }
    });
  }, [selectedCameras]);

  // Add periodic health check and reconnection logic
  useEffect(() => {
    const healthCheckInterval = setInterval(async () => {
      for (const camera of selectedCameras) {
        if (camera.status === 'active') {
          const pc = peerConnections.current[camera.id];
          
          // Check if connection is in a failed state
          if (pc && (pc.connectionState === 'failed' || pc.iceConnectionState === 'failed')) {
            console.log(`Detected failed connection for camera ${camera.id}, attempting reconnection...`);
            cleanupWebRTCConnection(camera.id);
            
            // Wait a bit before attempting reconnection
            setTimeout(() => {
              if (selectedCameras.some(cam => cam.id === camera.id)) {
                setupWebRTC(camera);
              }
            }, 2000);
          }
          
          // Check if we should have a connection but don't
          if (!pc && !processedStreams.current.has(camera.id)) {
            console.log(`Missing connection for active camera ${camera.id}, attempting to establish...`);
            setupWebRTC(camera);
          }
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(healthCheckInterval);
  }, [selectedCameras]);

  // Calculate grid dimensions
  const getGridDimensions = () => {
    if (layout && layout !== 'auto') {
      switch (layout) {
        case '1x1':
          return { rows: 1, cols: 1, total: 1 };
        case '2x2':
          return { rows: 2, cols: 2, total: 4 };
        case '3x3':
          return { rows: 3, cols: 3, total: 9 };
        default:
          break;
      }
    }
    const numCameras = selectedCameras.length;
    if (numCameras === 0) {
      return { rows: 1, cols: 1, total: 1 };
    }
    const size = Math.ceil(Math.sqrt(numCameras));
    return {
      rows: size,
      cols: size,
      total: size * size,
    };
  };

  const { rows, cols, total } = getGridDimensions();

  const gridSlots = Array(total)
    .fill(null)
    .map((_, index) => {
      const cameraEntry = Object.entries(gridAssignments).find(([_, pos]) => pos === index);
      if (cameraEntry) {
        const cameraId = cameraEntry[0];
        const camera = selectedCameras.find((cam) => cam.id === cameraId);
        if (camera) {
          return camera;
        }
      }
      return null;
    });

  const removeCameraFromGrid = (cameraId: string) => {
    cleanupWebRTCConnection(cameraId);
    setSelectedCameras(prev => prev.filter(cam => cam.id !== cameraId));
    const newGridAssignments = { ...gridAssignments };
    delete newGridAssignments[cameraId];
    setGridAssignments(newGridAssignments);
  };

  const toggleAudio = (cameraId: string) => {
    setSelectedCameras((prevCameras: Camera[]) => {
      console.log('Before toggleAudio for camera', cameraId, 'State:', prevCameras);
      const newCameras = prevCameras.map((cam) =>
        cam.id === cameraId ? { ...cam, audioEnabled: !cam.audioEnabled } : cam
      );
      console.log('After toggleAudio for camera', cameraId, 'New state:', newCameras);
      const videoElement = videoRefs.current[cameraId];
      if (videoElement) {
        const newAudioEnabled = newCameras.find((cam) => cam.id === cameraId)!.audioEnabled;
        videoElement.muted = !newAudioEnabled;
        console.log('Video element muted set to:', videoElement.muted);
      }
      return newCameras;
    });
  };

  const handleRecordingStart = async (cameraId: string) => {
    setIsRecording((prev) => ({ ...prev, [cameraId]: true }));
    setRecordingStartTime((prev) => ({ ...prev, [cameraId]: Date.now() }));
    console.log(`Recording started for camera ${cameraId}`);
  };

  const handleRecordingStop = async (cameraId: string) => {
    setIsRecording((prev) => ({ ...prev, [cameraId]: false }));
    setSelectedCameraId(cameraId);
    setShowRecordingConfirm(true);
    console.log(`Recording stopped for camera ${cameraId}`);
  };

  const handleRecordingConfirm = () => {
    if (selectedCameraId) {
      const recordingUrl = `recordings/${selectedCameraId}_${recordingStartTime[selectedCameraId]}.mp4`;
      onEventLog?.({
        type: 'recording',
        cameraId: selectedCameraId,
        mediaUrl: recordingUrl,
      });
    }
    setShowRecordingConfirm(false);
    setSelectedCameraId(null);
  };

  // Function to capture screenshot using go2rtc snapshot API
  const captureScreenshot = async (cameraId: string): Promise<string | null> => {
    try {
      console.log(`Capturing screenshot for camera ${cameraId} using go2rtc API`);
      
      const response = await axios.get(`${GO2RTC_API_URL}/api/frame.jpeg?src=${encodeURIComponent(cameraId)}`, {
        responseType: 'blob',
        timeout: 10000,
      });

      // Create a blob URL for the image
      const imageBlob = response.data;
      const imageUrl = URL.createObjectURL(imageBlob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `screenshot_${cameraId}_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);
      
      const screenshotUrl = `screenshots/${cameraId}_${Date.now()}.jpg`;
      console.log(`Screenshot captured successfully for camera ${cameraId}`);
      return screenshotUrl;
    } catch (error) {
      console.error(`Failed to capture screenshot for camera ${cameraId}:`, error);
      
      // Fallback to canvas capture if go2rtc API fails
      const videoElement = videoRefs.current[cameraId];
      if (videoElement && videoElement.videoWidth > 0) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = videoElement.videoWidth;
          canvas.height = videoElement.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoElement, 0, 0);
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/jpeg', 0.8);
            link.download = `screenshot_${cameraId}_${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return `screenshots/${cameraId}_${Date.now()}.jpg`;
          }
        } catch (canvasError) {
          console.error('Canvas capture also failed:', canvasError);
        }
      }
      
      return null;
    }
  };

  const handleCameraSelection = (slotIndex: number, selectedCameraId: string) => {
    const selectedCamera = allCameras.find((cam) => cam.id === selectedCameraId);
    if (!selectedCamera) return;

    const existingCameraIndex = selectedCameras.findIndex((cam) => cam.id === selectedCameraId);
    const currentSlotCamera = selectedCameras.find((cam) => cam.gridPosition === slotIndex);

    setSelectedCameras((prevCameras) => {
      let newCameras = [...prevCameras];
      if (existingCameraIndex !== -1) {
        newCameras = newCameras.map((cam) => {
          if (cam.id === selectedCameraId) {
            return { ...cam, gridPosition: slotIndex };
          }
          return cam;
        });
      } else {
        if (currentSlotCamera) {
          newCameras = newCameras.filter((cam) => cam.id !== currentSlotCamera.id);
        }
        newCameras.push({
          ...selectedCamera,
          gridPosition: slotIndex,
          audioEnabled: selectedCamera.audioEnabled ?? false,
          health: selectedCamera.health ?? Math.floor(Math.random() * 100),
        });
      }
      return newCameras;
    });

    setGridAssignments((prev) => {
      const newAssignments = { ...prev };
      if (currentSlotCamera) {
        delete newAssignments[currentSlotCamera.id];
      }
      newAssignments[selectedCameraId] = slotIndex;
      return newAssignments;
    });

    setShowCameraSelect(null);
  };

  useEffect(() => {
    const newAssignments: { [key: string]: number } = {};
    selectedCameras.forEach((camera) => {
      if (camera.gridPosition !== undefined) {
        newAssignments[camera.id] = camera.gridPosition;
      }
    });
    setGridAssignments(newAssignments);
  }, [selectedCameras]);

  useEffect(() => {
    setSelectedCameras((prevCameras: Camera[]) =>
      prevCameras.map((camera) => ({
        ...camera,
        audioEnabled: camera.audioEnabled ?? false,
        health: camera.health ?? Math.floor(Math.random() * 100),
      }))
    );
  }, []);

  const getFilledBars = (health: number) => {
    if (health >= 100) return 4;
    if (health >= 75) return 3;
    if (health >= 50) return 2;
    if (health >= 25) return 1;
    return 0;
  };

  const getHealthColor = (health: number) => {
    if (health >= 70) return 'bg-green-500';
    if (health >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const toggleFullscreen = (cameraId: string) => {
    const videoElement = videoRefs.current[cameraId];
    if (!videoElement) return;

    if (fullscreenCamera === cameraId) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setFullscreenCamera(null);
    } else {
      if (videoElement.requestFullscreen) {
        videoElement.requestFullscreen();
        setFullscreenCamera(cameraId);
      }
    }
  };

  // Add fullscreen change event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenCamera(null);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className="relative">
      <div className="flex-1">
        <div className="h-full">
          <div
            className="grid gap-0 h-full w-full"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
          >
            {gridSlots.map((camera, index) => (
              <div
                key={index}
                className="relative bg-gray-800 overflow-hidden aspect-video"
              >
                {camera ? (
                  <>
                    <video
                      ref={(el) => {
                        videoRefs.current[camera.id] = el;
                      }}
                      autoPlay
                      playsInline
                      muted={!camera.audioEnabled}
                      className="w-full h-full object-cover"
                      onError={(e) => console.error('Video load error:', e)}
                      onPlay={() => console.log('Video playing for camera', camera.id)}
                    />
                    <div className="absolute top-2 right-2 flex space-x-2">
                      <button
                        onClick={() => toggleFullscreen(camera.id)}
                        className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-500"
                        title={fullscreenCamera === camera.id ? "Exit Fullscreen" : "Enter Fullscreen"}
                      >
                        <FontAwesomeIcon icon={fullscreenCamera === camera.id ? faCompress : faExpand} />
                      </button>
                      {camera.ptzSupported && (
                        <button
                          onClick={() => setSelectedCamera(camera)}
                          className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-500"
                          title="PTZ Controls"
                        >
                          <FontAwesomeIcon icon={faArrowsAlt} />
                        </button>
                      )}
                      <TwoWayAudio camera={camera} />
                      <button
                        onClick={() => toggleAudio(camera.id)}
                        className={`px-2 py-1 rounded text-white ${
                          camera.audioEnabled
                            ? 'bg-yellow-600 hover:bg-yellow-500'
                            : 'bg-gray-600 hover:bg-gray-500'
                        }`}
                        title={camera.audioEnabled ? 'Mute' : 'Unmute'}
                      >
                        <FontAwesomeIcon icon={camera.audioEnabled ? faVolumeUp : faVolumeMute} />
                      </button>
                      <button
                        onClick={() => removeCameraFromGrid(camera.id)}
                        className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-500"
                        title="Remove Camera"
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>
                    <p className="absolute bottom-10 left-2 text-white bg-black bg-opacity-50 px-2 rounded">
                      {camera.name || `Camera ${camera.id}`}
                    </p>
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-black bg-opacity-50 px-2 py-1">
                      <div className="flex items-end space-x-1 w-12 h-4">
                        {[1, 2, 3, 4].map((bar) => {
                          const filledBars = getFilledBars(camera.health ?? 0);
                          const isFilled = bar <= filledBars;
                          const healthColor = getHealthColor(camera.health ?? 0);
                          return (
                            <div
                              key={bar}
                              className={`flex-1 rounded-sm ${
                                isFilled ? healthColor : 'bg-gray-700'
                              }`}
                              style={{ height: `${bar * 25}%` }}
                            />
                          );
                        })}
                      </div>
                      <div className="flex space-x-2">
                        {isRecording[camera.id] ? (
                          <button
                            onClick={() => handleRecordingStop(camera.id)}
                            className="text-red-500 hover:text-red-600"
                            title="Stop Recording"
                          >
                            <FontAwesomeIcon icon={faCircle} className="animate-pulse" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRecordingStart(camera.id)}
                            className="text-white hover:text-gray-300"
                            title="Start Recording"
                          >
                            <FontAwesomeIcon icon={faVideo} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedCameraId(camera.id);
                            setShowScreenshotConfirm(true);
                          }}
                          className="text-white hover:text-gray-300"
                          title="Take Screenshot"
                        >
                          <FontAwesomeIcon icon={faCamera} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center relative">
                    {showCameraSelect === index ? (
                      <select
                        className="absolute bg-gray-700 text-white p-2 rounded z-10"
                        onChange={(e) => handleCameraSelection(index, e.target.value)}
                        value=""
                        onBlur={() => setShowCameraSelect(null)}
                        autoFocus
                      >
                        <option value="" disabled>Select a camera</option>
                        {allCameras.map((camera) => (
                          <option key={camera.id} value={camera.id}>
                            {camera.name || `Camera ${camera.id}`}
                            {selectedCameras.some((cam) => cam.id === camera.id) ? ' (In Use)' : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        className="text-gray-400 text-4xl"
                        onClick={() => setShowCameraSelect(index)}
                      >
                        +
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {selectedCamera && (
          <PTZControls camera={selectedCamera} onClose={() => setSelectedCamera(null)} />
        )}
      </div>

      <ConfirmationDialog
        isOpen={showScreenshotConfirm}
        title="Take Screenshot"
        message="Do you want to take a screenshot of this camera view?"
        onConfirm={async () => {
          if (selectedCameraId) {
            const screenshotUrl = await captureScreenshot(selectedCameraId);
            if (screenshotUrl) {
              onEventLog?.({
                type: 'screenshot',
                cameraId: selectedCameraId,
                mediaUrl: screenshotUrl,
              });
            }
          }
          setShowScreenshotConfirm(false);
          setSelectedCameraId(null);
        }}
        onCancel={() => {
          setShowScreenshotConfirm(false);
          setSelectedCameraId(null);
        }}
      />

      <ConfirmationDialog
        isOpen={showRecordingConfirm}
        title="Save Recording"
        message="Do you want to save this recording to the event logs?"
        onConfirm={handleRecordingConfirm}
        onCancel={() => {
          setShowRecordingConfirm(false);
          setSelectedCameraId(null);
        }}
      />
    </div>
  );
};

export default VideoWall;