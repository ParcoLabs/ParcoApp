import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

interface Tab {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const tabs: Tab[] = [
  { id: 'tokenizations', label: 'Tokenizations', icon: 'fa-file-contract', path: '/admin/tokenizations' },
  { id: 'properties', label: 'Properties', icon: 'fa-building', path: '/admin/properties' },
  { id: 'investors', label: 'Investors', icon: 'fa-users', path: '/admin/investors' },
  { id: 'rent', label: 'Rent', icon: 'fa-money-bill-wave', path: '/admin/rent' },
  { id: 'demo', label: 'Demo Tools', icon: 'fa-flask', path: '/admin/demo' },
];

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { getToken } = useClerkAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const token = await getToken();
        
        if (!token) {
          setError('Access Denied');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/admin/user/role', {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);
          if (!data.isAdmin) {
            setError('Access Denied');
          }
        } else {
          setError('Access Denied');
        }
      } catch (err) {
        console.error('Error checking admin access:', err);
        setError('Access Denied');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      checkAdminAccess();
    } else {
      setLoading(false);
      setError('Access Denied');
    }
  }, [isAuthenticated, getToken]);

  const getCurrentTab = () => {
    const path = location.pathname;
    const tab = tabs.find(t => path.startsWith(t.path));
    return tab?.id || 'tokenizations';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  if (error || userRole !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-shield-halved text-red-500 text-3xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access the admin panel. This area is restricted to administrators only.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-brand-deep text-white px-6 py-2.5 rounded-lg font-medium hover:bg-opacity-90 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="fa-solid fa-arrow-left"></i>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-deep rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-shield-halved text-white text-sm"></i>
                </div>
                <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {userRole}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap rounded-lg transition-colors ${
                  getCurrentTab() === tab.id
                    ? 'bg-brand-mint text-brand-deep'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <i className={`fa-solid ${tab.icon}`}></i>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </div>
    </div>
  );
};
