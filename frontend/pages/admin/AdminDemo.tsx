import React, { useState, useEffect } from 'react';

interface AdminStats {
  totalUsers: number;
  totalProperties: number;
  totalTokenizations: number;
  pendingTokenizations: number;
  usersByRole: Record<string, number>;
}

export const AdminDemo: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-deep"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Demo Tools & Stats</h2>
      
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-users text-blue-600"></i>
              </div>
              <span className="text-sm text-gray-500">Total Users</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-building text-green-600"></i>
              </div>
              <span className="text-sm text-gray-500">Properties</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalProperties}</p>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-file-contract text-purple-600"></i>
              </div>
              <span className="text-sm text-gray-500">Tokenizations</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalTokenizations}</p>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-clock text-yellow-600"></i>
              </div>
              <span className="text-sm text-gray-500">Pending Review</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingTokenizations}</p>
          </div>
        </div>
      )}

      {stats && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Users by Role</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{stats.usersByRole.USER || 0}</p>
              <p className="text-sm text-gray-500">Users</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">{stats.usersByRole.TOKENIZER || 0}</p>
              <p className="text-sm text-blue-600">Tokenizers</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-700">{stats.usersByRole.ADMIN || 0}</p>
              <p className="text-sm text-purple-600">Admins</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Demo Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <i className="fa-solid fa-database text-gray-400"></i>
              <span className="font-medium text-gray-900">Seed Demo Data</span>
            </div>
            <p className="text-sm text-gray-500 mb-3">Populate the database with sample properties and users</p>
            <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
              Coming Soon
            </button>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <i className="fa-solid fa-trash text-gray-400"></i>
              <span className="font-medium text-gray-900">Reset Demo Environment</span>
            </div>
            <p className="text-sm text-gray-500 mb-3">Clear all demo data and reset to initial state</p>
            <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
