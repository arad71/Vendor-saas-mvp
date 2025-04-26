import React from 'react';
import { Link } from 'react-router-dom';

const ActivityItem = ({ activity }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getLinkPath = () => {
    if (activity.type === 'listing') {
      return `/listings/${activity.id}/edit`;
    } else if (activity.type === 'booking') {
      return `/calendar`;
    }
    return '#';
  };

  return (
    <div className="border-b pb-3 last:border-b-0 last:pb-0">
      <div className="flex justify-between items-start mb-1">
        <Link to={getLinkPath()} className="font-medium text-indigo-600 hover:text-indigo-800">
          {activity.title}
        </Link>
        {getStatusBadge(activity.status)}
      </div>
      <div className="flex justify-between items-center text-sm text-gray-500">
        <div>
          {activity.type === 'listing' ? '✏️ Listing' : '📅 Booking'}
        </div>
        <div>
          {formatDate(activity.timestamp)}
        </div>
      </div>
    </div>
  );
};

export default ActivityItem;
