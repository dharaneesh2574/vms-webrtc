import React from 'react';

const AlertSettings: React.FC = () => {
  return (
    <div className="p-6 bg-gray-900 text-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-100">Alert Settings</h1>
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-200">Notification Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg border border-gray-600">
                <div>
                  <h3 className="font-medium text-gray-200">High Priority Alerts</h3>
                  <p className="text-sm text-gray-400">
                    Critical security events and system alerts
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600 rounded bg-gray-600 border-gray-500" defaultChecked />
                    <span className="ml-2 text-gray-300">Email</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600 rounded bg-gray-600 border-gray-500" defaultChecked />
                    <span className="ml-2 text-gray-300">SMS</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg border border-gray-600">
                <div>
                  <h3 className="font-medium text-gray-200">Medium Priority Alerts</h3>
                  <p className="text-sm text-gray-400">
                    Important but non-critical notifications
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600 rounded bg-gray-600 border-gray-500" defaultChecked />
                    <span className="ml-2 text-gray-300">Email</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600 rounded bg-gray-600 border-gray-500" />
                    <span className="ml-2 text-gray-300">SMS</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg border border-gray-600">
                <div>
                  <h3 className="font-medium text-gray-200">Low Priority Alerts</h3>
                  <p className="text-sm text-gray-400">
                    General information and updates
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600 rounded bg-gray-600 border-gray-500" defaultChecked />
                    <span className="ml-2 text-gray-300">Email</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600 rounded bg-gray-600 border-gray-500" />
                    <span className="ml-2 text-gray-300">SMS</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-200">Contact Information</h2>
            <div className="grid gap-4">
              <div className="flex flex-col">
                <label className="mb-2 font-medium text-gray-300">Email Address</label>
                <input 
                  type="email" 
                  className="bg-gray-700 border-gray-600 text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-2 font-medium text-gray-300">Phone Number</label>
                <input 
                  type="tel" 
                  className="bg-gray-700 border-gray-600 text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1 (555) 000-0000"
                />
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

export default AlertSettings; 