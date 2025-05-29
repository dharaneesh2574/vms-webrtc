import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import MainPage from './pages/MainPage';
import { authenticate } from './api/auth';
import EventLogs from './pages/EventLogs';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    console.log('App component mounted');
    const checkAuth = async () => {
      try {
        const response = await authenticate({ username: '', password: '' });
        setIsAuthenticated(response.success);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/monitor" /> : <Login setAuthenticated={setIsAuthenticated} />
          }
        />
        <Route
          path="/event-logs"
          element={
            isAuthenticated ? (
              <div className="flex h-screen bg-gray-100">
                <Sidebar />
                <div className="flex-1 flex flex-col">
                  <Navbar setAuthenticated={setIsAuthenticated} />
                  <EventLogs />
                </div>
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/*"
          element={
            isAuthenticated ? <MainPage setAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" />
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;