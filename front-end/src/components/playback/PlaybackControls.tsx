import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faPause,
  faCamera,
  faVideo,
  faForward,
  faBackward,
  faVolumeHigh,
} from '@fortawesome/free-solid-svg-icons';

interface PlaybackControlsProps {
  onPlay?: () => void;
  onPause?: () => void;
  onSpeedChange?: (speed: number) => void;
  onVolumeChange?: (volume: number) => void;
  isPlaying?: boolean;
  currentSpeed?: number;
  volume?: number;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  onPlay,
  onPause,
  onSpeedChange,
  onVolumeChange,
  isPlaying = false,
  currentSpeed = 1,
  volume = 1,
}) => {
  const handleSpeedDecrease = () => {
    if (!onSpeedChange) return;
    const newSpeed = Math.max(0.25, currentSpeed - 0.25);
    onSpeedChange(Number(newSpeed.toFixed(2)));
  };

  const handleSpeedIncrease = () => {
    if (!onSpeedChange) return;
    const newSpeed = Math.min(2, currentSpeed + 0.25);
    onSpeedChange(Number(newSpeed.toFixed(2)));
  };

  return (
    <div className="flex items-center justify-between px-8 py-2 bg-gray-800 rounded-md text-white">
      {/* Current Speed Display */}
      <div className="flex items-center space-x-2 min-w-[80px]">
        <span className="text-sm font-medium">{currentSpeed}x</span>
      </div>

      {/* Playback Controls Group */}
      <div className="flex items-center justify-center space-x-4">
        {/* Backward Button */}
        <button 
          onClick={handleSpeedDecrease} 
          className={`w-8 h-8 flex items-center justify-center rounded-full ${currentSpeed === 0.25 ? 'bg-gray-600 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600'} text-gray-300`}
          disabled={currentSpeed <= 0.25}
        >
          <FontAwesomeIcon icon={faBackward} />
        </button>

        {/* Play/Pause Button */}
        <button 
          onClick={isPlaying ? onPause : onPlay} 
          className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
        >
          <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} size="lg" />
        </button>

        {/* Forward Button */}
        <button 
          onClick={handleSpeedIncrease}
          className={`w-8 h-8 flex items-center justify-center rounded-full ${currentSpeed >= 2 ? 'bg-gray-600 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600'} text-gray-300`}
          disabled={currentSpeed >= 2}
        >
          <FontAwesomeIcon icon={faForward} />
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center space-x-2 min-w-[120px] justify-end">
        <FontAwesomeIcon icon={faVolumeHigh} className="text-gray-400" />
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.1" 
          value={volume}
          onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
          className="w-20 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  );
};

export default PlaybackControls; 