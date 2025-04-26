import React from 'react';
import { Link } from 'react-router-dom';

const ListingCard = ({ listing, onStatusChange }) => {
  const { id, title, description, price, images, status, createdAt } = listing;
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800'
  };
  
  const handleStatusToggle = () => {
    const newStatus = status === 'active' ? 'inactive' : 'active';
    onStatusChange(id, newStatus);
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="h-48 bg-gray-200 relative">
        {images && images.length > 0 ? (
          <img 
            src={images[0]} 
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No Image
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{description}</p>
        <p className="text-indigo-600 font-bold mb-4">${parseFloat(price).toFixed(2)}</p>
        
        <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
          <span>Created: {formatDate(createdAt)}</span>
        </div>
        
        <div className="flex space-x-2">
          <Link 
            to={`/listings/${id}/edit`}
            className="flex-1 bg-indigo-100 text-indigo-600 text-center py-2 rounded hover:bg-indigo-200 transition-colors"
          >
            Edit
          </Link>
          <button
            className={`flex-1 ${
              status === 'active' 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            } py-2 rounded transition-colors`}
            onClick={handleStatusToggle}
          >
            {status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
