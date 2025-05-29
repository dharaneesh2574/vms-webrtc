import React from 'react';
import { Camera, Alert } from '../types';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardProps {
  cameras: Camera[];
  alerts: Alert[];
}

const Dashboard: React.FC<DashboardProps> = ({ cameras, alerts }) => {
  // Dummy camera data with realistic health values
  const dummyCameras = [
    { id: '1', name: 'Entrance Cam', health: 95 },
    { id: '2', name: 'Parking Lot', health: 88 },
    { id: '3', name: 'Lobby', health: 92 },
    { id: '4', name: 'Server Room', health: 78 },
    { id: '5', name: 'Loading Dock', health: 65 },
    { id: '6', name: 'Warehouse', health: 82 },
  ];

  const onlineCameras = dummyCameras.filter((c) => c.health > 70).length;
  const alertCount = 24;
  const highPriorityAlerts = 8;
  const mediumPriorityAlerts = 7;
  const lowPriorityAlerts = 9;

  // Camera Health Data
  const cameraHealthData = {
    labels: dummyCameras.map(c => c.name),
    datasets: [{
      label: 'Camera Health',
      data: dummyCameras.map(c => c.health),
      backgroundColor: dummyCameras.map(c => {
        const health = c.health;
        return health >= 90 ? '#10B981' : health >= 70 ? '#F59E0B' : '#EF4444';
      }),
      borderColor: '#374151',
      borderWidth: 1,
    }]
  };

  // Alert Trends Data (Last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }).reverse();

  const alertTrendsData = {
    labels: last7Days,
    datasets: [
      {
        label: 'High Priority',
        data: [3, 5, 2, 4, 6, 3, 2],
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Medium Priority',
        data: [4, 3, 5, 2, 4, 3, 5],
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Low Priority',
        data: [2, 3, 4, 5, 3, 4, 2],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      }
    ]
  };

  // Alert Distribution Data
  const alertDistributionData = {
    labels: ['High', 'Medium', 'Low'],
    datasets: [{
      data: [highPriorityAlerts, mediumPriorityAlerts, lowPriorityAlerts],
      backgroundColor: ['#EF4444', '#F59E0B', '#10B981'],
      borderColor: '#374151',
      borderWidth: 1,
    }]
  };

  // Dummy recent alerts
  const recentAlerts = [
    { id: '1', title: 'Motion Detected', priority: 'high', cameraName: 'Entrance Cam' },
    { id: '2', title: 'Camera Offline', priority: 'medium', cameraName: 'Loading Dock' },
    { id: '3', title: 'Storage Warning', priority: 'low', cameraName: 'Server Room' },
    { id: '4', title: 'Unauthorized Access', priority: 'high', cameraName: 'Server Room' },
    { id: '5', title: 'Network Latency', priority: 'medium', cameraName: 'Warehouse' },
  ];

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#9CA3AF',
        },
      },
    },
    scales: {
      y: {
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#9CA3AF',
        },
      },
      x: {
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#9CA3AF',
        },
      },
    },
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h2 className="text-2xl font-bold text-white mb-6">Dashboard</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <h3 className="text-gray-400 text-sm font-medium">Total Cameras</h3>
          <p className="text-2xl font-bold text-white mt-2">{dummyCameras.length}</p>
          <p className="text-green-400 text-sm mt-1">{onlineCameras} Online</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <h3 className="text-gray-400 text-sm font-medium">Total Alerts</h3>
          <p className="text-2xl font-bold text-white mt-2">{alertCount}</p>
          <p className="text-red-400 text-sm mt-1">{highPriorityAlerts} High Priority</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <h3 className="text-gray-400 text-sm font-medium">Storage Usage</h3>
          <p className="text-2xl font-bold text-white mt-2">68%</p>
          <p className="text-yellow-400 text-sm mt-1">340GB / 500GB</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <h3 className="text-gray-400 text-sm font-medium">System Health</h3>
          <p className="text-2xl font-bold text-white mt-2">88%</p>
          <p className="text-green-400 text-sm mt-1">All Systems Operational</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Health Chart */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Camera Health Status</h3>
          <div className="h-64">
            <Bar data={cameraHealthData} options={chartOptions} />
          </div>
        </div>

        {/* Alert Trends Chart */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Alert Trends (Last 7 Days)</h3>
          <div className="h-64">
            <Line data={alertTrendsData} options={chartOptions} />
          </div>
        </div>

        {/* Alert Distribution Chart */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Alert Distribution</h3>
          <div className="h-64">
            <Doughnut data={alertDistributionData} options={chartOptions} />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                <div>
                  <p className="text-white font-medium">{alert.title}</p>
                  <p className="text-gray-400 text-sm">{alert.cameraName}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  alert.priority === 'high' ? 'bg-red-900 text-red-200' :
                  alert.priority === 'medium' ? 'bg-yellow-900 text-yellow-200' :
                  'bg-green-900 text-green-200'
                }`}>
                  {alert.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
