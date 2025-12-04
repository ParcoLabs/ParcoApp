import React from 'react';

export const AdminProperties: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Properties Management</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <i className="fa-solid fa-building text-4xl text-gray-300 mb-4"></i>
        <p className="text-gray-600 mb-2">Properties management coming soon</p>
        <p className="text-sm text-gray-400">View, edit, and manage all tokenized properties</p>
      </div>
    </div>
  );
};
