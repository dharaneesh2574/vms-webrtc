import React from 'react';
import { Alert } from '../types';

interface AlertBoxProps {
  alerts: Alert[];
}

const AlertBox: React.FC<AlertBoxProps> = ({ alerts }) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Alerts</h2>
      {alerts.length === 0 ? (
        <p>No alerts</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="p-2 bg-red-100 border-l-4 border-red-500 rounded"
            >
              <p><strong>{alert.title}</strong> - Camera: {alert.cameraName}</p>
              <p>{alert.description}</p>
              <p className="text-sm text-gray-600">{new Date(alert.timestamp).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AlertBox;
