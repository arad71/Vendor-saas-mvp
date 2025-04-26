import React from 'react';

const ServiceToggle = ({ service, onUpdate, onRemove }) => {
  const handleToggle = () => {
    onUpdate('isActive', !service.isActive);
  };

  return (
    <div className={`border rounded-md p-4 ${service.isActive ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'}`}>
      <div className="flex justify-between mb-3">
        <div className="flex items-center">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="form-checkbox h-5 w-5 text-indigo-600"
              checked={service.isActive}
              onChange={handleToggle}
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              {service.isActive ? 'Active' : 'Inactive'}
            </span>
          </label>
        </div>
        <button
          type="button"
          className="text-red-500 hover:text-red-700"
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Service Name
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={service.name}
            onChange={(e) => onUpdate('name', e.target.value)}
            placeholder="e.g. Express Delivery"
          />
        </div>
        
        <div className="md:col-span-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={service.description}
            onChange={(e) => onUpdate('description', e.target.value)}
            placeholder="Brief description"
          />
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={service.price}
            onChange={(e) => onUpdate('price', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default ServiceToggle;
