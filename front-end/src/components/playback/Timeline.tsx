import React from 'react';

interface TimelineProps {
  currentTime: number; // in seconds
  totalTime: number; // in seconds
  onSeek: (time: number) => void;
  // We can add bufferedTime, markers for events, etc. later
}

const Timeline: React.FC<TimelineProps> = ({
  currentTime,
  totalTime,
  onSeek,
}) => {
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;

  const handleSeek = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (totalTime === 0) return;
    const timelineRect = event.currentTarget.getBoundingClientRect();
    const clickPositionX = event.clientX - timelineRect.left;
    const clickRatio = clickPositionX / timelineRect.width;
    const seekTime = clickRatio * totalTime;
    onSeek(Math.max(0, Math.min(seekTime, totalTime)));
  };

  return (
    <div className="w-full p-2 bg-gray-800 rounded-md mt-2">
      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-300">{formatTime(currentTime)}</span>
        <div 
          className="relative flex-1 h-2 bg-gray-700 rounded-full cursor-pointer"
          onClick={handleSeek}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-blue-600 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
          {/* Current time thumb */}
          <div 
            className="absolute top-1/2 left-0 w-3 h-3 bg-blue-400 rounded-full -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${progressPercentage}%` }}
          />
        </div>
        <span className="text-xs text-gray-300">{formatTime(totalTime)}</span>
      </div>
      {/* Add markers or other elements here if needed */}
    </div>
  );
};

export default Timeline; 