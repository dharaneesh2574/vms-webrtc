import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Font Awesome imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState<string>('');

  // Update current date and time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format: "Mon, May 19, 2025, 04:14 PM IST"
      const formattedTime = now.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      }) + ' IST';
      setCurrentTime(formattedTime);
    };

    updateTime(); // Initial call
    const interval = setInterval(updateTime, 1000); // Update every second

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  return (
    <div className="bg-gray-700 text-white p-4 flex justify-between items-center">
      {/* Date and Time */}
      <div className="text-sm">{currentTime}</div>

      {/* Right Side: Notification */}
      <div className="flex items-center space-x-4">
        {/* Notification Bell Icon */}
        <button
          onClick={() => navigate('/notifications')}
          className="focus:outline-none"
          title="Notifications"
        >
          <FontAwesomeIcon icon={faBell} className="h-6 w-6 text-white" />
        </button>
      </div>
    </div>
  );
};

export default Navbar;