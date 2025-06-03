import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainPage from './pages/MainPage';
import EventLogs from './pages/EventLogs';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/event-logs"
          element={
            <div className="flex h-screen bg-gray-100">
              <Sidebar />
              <div className="flex-1 flex flex-col">
                <Navbar />
                <EventLogs />
              </div>
            </div>
          }
        />
        <Route path="/" element={<Navigate to="/monitor" replace />} />
        <Route path="/*" element={<MainPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;