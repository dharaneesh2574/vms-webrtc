import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import kato_logo_extended from '../assets/kato_logo_extended.png';
import kato_logo_shrinked from '../assets/kato_logo.png';
import { 
  MdMonitor, 
  MdPlayCircle, 
  MdDevices, 
  MdSettings, 
  MdDashboard,
  MdWarning,
  MdKeyboardArrowDown,
  MdKeyboardArrowRight,
  MdMenu,
  MdStorage,
  MdPerson,
  MdHistory,
  MdAssignment,
} from 'react-icons/md';

const Sidebar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const mainNavItems = [
    { name: 'Monitor', path: '/monitor', icon: <MdMonitor size={24} /> },
    { name: 'Playback', path: '/playback', icon: <MdPlayCircle size={24} /> },
    { name: 'AlertBox', path: '/alertbox', icon: <MdWarning size={24} /> },
    { name: 'Event Logs', path: '/event-logs', icon: <MdHistory size={24} /> },
    { name: 'Tickets', path: '/tickets', icon: <MdAssignment size={24} /> },
    { name: 'Dashboard', path: '/dashboard', icon: <MdDashboard size={24} /> },
  ];

  const configItems = [
    { name: 'Device Manager', path: '/configurations/device-manager', icon: <MdDevices size={24} /> },
    { name: 'Record Settings', path: '/configurations/record-settings', icon: <MdStorage size={24} /> },
    { name: 'Alert Settings', path: '/configurations/alert-settings', icon: <MdWarning size={24} /> },
    { name: 'User Access', path: '/configurations/user-access', icon: <MdPerson size={24} /> },
  ];

  return (
    <div 
      className={`${
        isExpanded ? 'w-64' : 'w-20'
      } bg-gray-800 text-white transition-all duration-300 ease-in-out min-h-screen relative`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3 top-4 bg-gray-800 text-white p-1 rounded-full hover:bg-gray-700 z-10"
      >
        <MdMenu size={24} className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-0' : 'rotate-180'}`} />
      </button>

      <div className={`flex items-center ${isExpanded ? 'justify-start pl-4' : 'justify-center'} h-16`}>
        <img 
          src={isExpanded ? kato_logo_extended : kato_logo_shrinked } 
          alt="VMS Logo"
          className={`${isExpanded ? 'h-10' : 'h-8'} object-contain transition-all duration-200`}
        />
      </div>

      <nav className="mt-4">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center ${
                isExpanded ? 'px-4' : 'justify-center px-2'
              } py-3 rounded mb-2 transition-colors duration-200 ${
                isActive ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`
            }
            title={!isExpanded ? item.name : ''}
          >
            <span className="inline-block">{item.icon}</span>
            {isExpanded && (
              <span className="ml-3 transition-opacity duration-200">
                {item.name}
              </span>
            )}
          </NavLink>
        ))}

        {/* Configurations Section */}
        <div className="mt-4">
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className={`flex items-center w-full ${
              isExpanded ? 'px-4' : 'justify-center px-2'
            } py-3 hover:bg-gray-700 rounded transition-colors duration-200`}
            title={!isExpanded ? 'Configurations' : ''}
          >
            <MdSettings size={24} />
            {isExpanded && (
              <>
                <span className="ml-3">Configurations</span>
                {isConfigOpen ? <MdKeyboardArrowDown size={20} className="ml-auto" /> : <MdKeyboardArrowRight size={20} className="ml-auto" />}
              </>
            )}
          </button>

          {/* Configuration Submenu */}
          <div className={`mt-1 ${isConfigOpen ? 'block' : 'hidden'}`}>
            {configItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center ${
                    isExpanded ? 'px-8' : 'justify-center px-2'
                  } py-3 rounded mb-1 transition-colors duration-200 ${
                    isActive ? 'bg-blue-600' : 'hover:bg-gray-700'
                  }`
                }
                title={!isExpanded ? item.name : ''}
              >
                <span className="inline-block">{item.icon}</span>
                {isExpanded && (
                  <span className="ml-3 transition-opacity duration-200 text-sm">
                    {item.name}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;