import React, { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faVolumeUp, faVolumeMute, faArrowsAlt, faCircle, faCamera, faVideo } from '@fortawesome/free-solid-svg-icons';
import ConfirmationDialog from '../ConfirmationDialog';

interface VideoPlayerProps {
  streamUrl: string;
  isPlaying: boolean;
  volume: number;
  playbackSpeed: number;
  currentTime: number;
  cameraId: string;
  onTimeUpdate?: (currentTime: number, totalTime: number) => void;
  onLoadedData?: (totalTime: number) => void;
  onEventLog?: (event: {
    type: 'screenshot' | 'recording';
    cameraId: string;
    mediaUrl: string;
  }) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  streamUrl,
  isPlaying,
  volume,
  playbackSpeed,
  currentTime,
  cameraId,
  onTimeUpdate,
  onLoadedData,
  onEventLog,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSeekTime = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [showScreenshotConfirm, setShowScreenshotConfirm] = useState(false);
  const [showRecordingConfirm, setShowRecordingConfirm] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(error => console.error("Error attempting to play video:", error));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, streamUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  useEffect(() => {
    if (videoRef.current && currentTime != null) {
      if (Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
        videoRef.current.currentTime = currentTime;
        lastSeekTime.current = currentTime;
      }
    }
  }, [currentTime]);

  useEffect(() => {
    const videoElement = videoRef.current;
    const handleLoadedMetadata = () => {
      if (videoElement) {
        if (onLoadedData) {
          onLoadedData(videoElement.duration);
        }
        if (onTimeUpdate) {
          onTimeUpdate(videoElement.currentTime, videoElement.duration);
        }
      }
    };
    videoElement?.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => videoElement?.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [streamUrl, onLoadedData, onTimeUpdate]);

  useEffect(() => {
    const videoElement = videoRef.current;
    const handleTimeUpdate = () => {
      if (videoElement && onTimeUpdate) {
        onTimeUpdate(videoElement.currentTime, videoElement.duration);
      }
    };
    videoElement?.addEventListener('timeupdate', handleTimeUpdate);
    return () => videoElement?.removeEventListener('timeupdate', handleTimeUpdate);
  }, [onTimeUpdate]);

  const handleRecordingStart = () => {
    setIsRecording(true);
    setRecordingStartTime(Date.now());
  };

  const handleRecordingStop = () => {
    setIsRecording(false);
    setShowRecordingConfirm(true);
  };

  const handleRecordingConfirm = () => {
    const recordingUrl = `recordings/${cameraId}_${recordingStartTime}.mp4`;
    onEventLog?.({
      type: 'recording',
      cameraId: cameraId,
      mediaUrl: recordingUrl,
    });
    setShowRecordingConfirm(false);
  };

  const handleScreenshotConfirm = () => {
    const screenshotUrl = `screenshots/${cameraId}_${Date.now()}.jpg`;
    onEventLog?.({
      type: 'screenshot',
      cameraId: cameraId,
      mediaUrl: screenshotUrl,
    });
    setShowScreenshotConfirm(false);
  };

  return (
    <div className="w-full h-full bg-black relative rounded-b-lg">
      <video
        ref={videoRef}
        src={streamUrl}
        controls
        className="w-full h-full rounded-b-lg"
        muted
      >
        Your browser does not support the video tag.
      </video>
      
      {/* Per-camera controls overlay */}
      <div className="absolute top-2 right-2 flex flex-col space-y-2 z-10">
        <button
          onClick={() => setShowScreenshotConfirm(true)}
          className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-500"
          title="Take Screenshot"
        >
          <FontAwesomeIcon icon={faCamera} />
        </button>
        <button
          onClick={isRecording ? handleRecordingStop : handleRecordingStart}
          className={`px-2 py-1 rounded text-white ${
            isRecording ? 'bg-red-600 animate-pulse' : 'bg-red-600'
          } hover:bg-red-500`}
          title={isRecording ? "Stop Recording" : "Start Recording"}
        >
          <FontAwesomeIcon icon={isRecording ? faCircle : faVideo} />
        </button>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={showScreenshotConfirm}
        title="Take Screenshot"
        message="Do you want to take a screenshot of this camera view?"
        onConfirm={handleScreenshotConfirm}
        onCancel={() => setShowScreenshotConfirm(false)}
      />

      <ConfirmationDialog
        isOpen={showRecordingConfirm}
        title="Save Recording"
        message="Do you want to save this recording to the event logs?"
        onConfirm={handleRecordingConfirm}
        onCancel={() => setShowRecordingConfirm(false)}
      />
    </div>
  );
};

export default VideoPlayer; 