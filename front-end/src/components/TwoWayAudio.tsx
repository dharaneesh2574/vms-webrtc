import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons';
import { Camera } from '../types';

interface TwoWayAudioProps {
  camera: Camera;
}

const TwoWayAudio: React.FC<TwoWayAudioProps> = ({ camera }) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0); // For visualizing audio levels

  const toggleAudio = async () => {
    if (!isAudioEnabled) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone stream started:', stream);
        setMicStream(stream);
        setIsAudioEnabled(true);
        setError(null);
      } catch (err) {
        console.error('Microphone access error:', err);
        setError('Microphone access denied or unavailable.');
      }
    } else {
      if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        console.log('Microphone stream stopped');
        setMicStream(null);
      }
      setIsAudioEnabled(false);
      setError(null);
    }
  };

  // Visualize audio levels
  useEffect(() => {
    if (micStream) {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(micStream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const avgVolume = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
        setVolume(avgVolume);
        if (micStream) requestAnimationFrame(checkAudio);
      };
      checkAudio();

      return () => {
        audioContext.close();
      };
    }
  }, [micStream]);

  useEffect(() => {
    return () => {
      if (micStream) {
        console.log('Cleaning up mic stream on unmount');
        micStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [micStream]);

  return (
    <div className="relative">
      <button
        onClick={toggleAudio}
        disabled={!!error}
        className={`px-2 py-1 rounded text-white ${isAudioEnabled ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 hover:bg-gray-500'}`}
        title={isAudioEnabled ? 'Disable Two-Way Audio' : 'Enable Two-Way Audio'}
      >
        <FontAwesomeIcon icon={isAudioEnabled ? faMicrophone : faMicrophoneSlash} />
      </button>
      {isAudioEnabled && (
        <div className="absolute top-full mt-2 w-20 h-4 bg-gray-300 rounded">
          <div
            className="h-full bg-green-500 rounded"
            style={{ width: `${(volume / 255) * 100}%` }}
          />
        </div>
      )}
      {error && (
        <div className="absolute top-full mt-2 bg-red-600 text-white text-xs rounded p-2 w-40">
          {error}
        </div>
      )}
    </div>
  );
};

export default TwoWayAudio;