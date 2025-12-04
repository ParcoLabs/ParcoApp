import React from 'react';

export const AdminRent: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Rent Management</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <i className="fa-solid fa-money-bill-wave text-4xl text-gray-300 mb-4"></i>
        <p className="text-gray-600 mb-2">Rent management coming soon</p>
        <p className="text-sm text-gray-400">View and manage rent distributions, payments, and schedules</p>
      </div>
    </div>
  );
};
