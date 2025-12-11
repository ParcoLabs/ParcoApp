import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

interface DashboardStats {
  totalUsers: number;
  totalProperties: number;
  pendingTokenizations: number;
  totalInvested: number;
  activeLoans: number;
  pendingKYC: number;
}

export const AdminOverview: React.FC = () => {
  const navigate = useNavigate();
  const { getToken } = useClerkAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalProperties: 0,
    pendingTokenizations: 0,
    totalInvested: 0,
    activeLoans: 0,
    pendingKYC: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = await getToken();
      
      const [usersRes, propertiesRes, tokenizationsRes] = await Promise.all([
        fetch('/api/admin/investors', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/properties', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/tokenizations', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const usersData = usersRes.ok ? await usersRes.json() : { data: [] };
      const propertiesData = propertiesRes.ok ? await propertiesRes.json() : { data: [] };
      const tokenizationsData = tokenizationsRes.ok ? await tokenizationsRes.json() : { data: [] };

      const pendingTokenizations = tokenizationsData.data?.filter(
        (t: any) => t.status === 'SUBMITTED' || t.status === 'IN_REVIEW'
      ).length || 0;

      setStats({
        totalUsers: usersData.data?.length || 0,
        totalProperties: propertiesData.data?.length || 0,
        pendingTokenizations,
        totalInvested: 0,
        activeLoans: 0,
        pendingKYC: usersData.data?.filter((u: any) => u.kycStatus === 'PENDING').length || 0
      });

      const activities = [
        ...(tokenizationsData.data?.slice(0, 3).map((t: any) => ({
          type: 'tokenization',
          title: `New tokenization: ${t.propertyAddress}`,
          status: t.status,
          time: new Date(t.createdAt).toLocaleDateString()
        })) || []),
        ...(usersData.data?.slice(0, 3).map((u: any) => ({
          type: 'user',
          title: `User registered: ${u.email}`,
          status: u.kycStatus,
          time: new Date(u.createdAt).toLocaleDateString()
        })) || [])
      ].slice(0, 5);

      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      label: 'Total Users', 
      value: stats.totalUsers, 
      icon: 'fa-users', 
      color: 'bg-blue-500',
      path: '/admin/investors'
    },
    { 
      label: 'Properties', 
      value: stats.totalProperties, 
      icon: 'fa-building', 
      color: 'bg-green-500',
      path: '/admin/properties'
    },
    { 
      label: 'Pending Reviews', 
      value: stats.pendingTokenizations, 
      icon: 'fa-clock', 
      color: 'bg-amber-500',
      path: '/admin/tokenizations'
    },
    { 
      label: 'Pending KYC', 
      value: stats.pendingKYC, 
      icon: 'fa-id-card', 
      color: 'bg-purple-500',
      path: '/admin/investors'
    },
  ];

  const quickActions = [
    { label: 'Review Tokenizations', icon: 'fa-file-contract', path: '/admin/tokenizations', color: 'bg-brand-deep' },
    { label: 'Manage Properties', icon: 'fa-building', path: '/admin/properties', color: 'bg-green-600' },
    { label: 'View Investors', icon: 'fa-users', path: '/admin/investors', color: 'bg-blue-600' },
    { label: 'Run Rent Cycle', icon: 'fa-money-bill-wave', path: '/admin/rent', color: 'bg-amber-600' },
    { label: 'Demo Tools', icon: 'fa-flask', path: '/admin/demo', color: 'bg-purple-600' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your platform and monitor activity</p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div 
            key={index}
            onClick={() => navigate(stat.path)}
            className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] p-4 sm:p-5 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center`}>
                <i className={`fa-solid ${stat.icon} text-white text-lg sm:text-xl`}></i>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] p-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => navigate(action.path)}
                className={`${action.color} text-white p-3 sm:p-4 rounded-xl hover:opacity-90 transition-opacity flex flex-col items-center gap-2`}
              >
                <i className={`fa-solid ${action.icon} text-xl sm:text-2xl`}></i>
                <span className="text-xs sm:text-sm font-medium text-center">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#2a2a2a] p-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.type === 'tokenization' ? 'bg-brand-mint text-brand-deep' : 'bg-blue-100 text-blue-600'
                  }`}>
                    <i className={`fa-solid ${activity.type === 'tokenization' ? 'fa-file-contract' : 'fa-user'} text-sm`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{activity.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    activity.status === 'APPROVED' || activity.status === 'VERIFIED' 
                      ? 'bg-green-100 text-green-700'
                      : activity.status === 'PENDING' || activity.status === 'SUBMITTED'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-700 dark:text-gray-300'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <i className="fa-solid fa-inbox text-3xl mb-2"></i>
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-brand-deep to-brand-dark rounded-xl p-5 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Platform Status</h3>
            <p className="text-sm text-white/80 mt-1">All systems operational</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-sm font-medium">Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};
