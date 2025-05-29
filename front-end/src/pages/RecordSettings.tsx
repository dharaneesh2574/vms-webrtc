import React from 'react';

const RecordSettings: React.FC = () => {
  return (
    <div className="p-6 bg-gray-900 text-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-100">Record Settings</h1>
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-200">Recording Configuration</h2>
            <div className="grid gap-4">
              <div className="flex flex-col">
                <label className="mb-2 font-medium text-gray-300">Default Recording Duration</label>
                <select className="bg-gray-700 border-gray-600 text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="1">1 Hour</option>
                  <option value="2">2 Hours</option>
                  <option value="4">4 Hours</option>
                  <option value="8">8 Hours</option>
                  <option value="24">24 Hours</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="mb-2 font-medium text-gray-300">Storage Location</label>
                <input 
                  type="text" 
                  className="bg-gray-700 border-gray-600 text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="/path/to/storage"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-200">Recording Quality</h2>
            <div className="grid gap-4">
              <div className="flex flex-col">
                <label className="mb-2 font-medium text-gray-300">Video Quality</label>
                <select className="bg-gray-700 border-gray-600 text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="high">High (1080p)</option>
                  <option value="medium">Medium (720p)</option>
                  <option value="low">Low (480p)</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="mb-2 font-medium text-gray-300">Frame Rate</label>
                <select className="bg-gray-700 border-gray-600 text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="30">30 FPS</option>
                  <option value="24">24 FPS</option>
                  <option value="15">15 FPS</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <button className="px-4 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors duration-200">
            Reset
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordSettings; 