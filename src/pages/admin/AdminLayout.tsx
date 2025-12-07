import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { AdminNavigation } from '../../components/AdminNavigation';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
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
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="flex-1 md:ml-64 pt-16 md:pt-0 pb-20 md:pb-0">
        <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-brand-deep focus:bg-white transition-all w-64"
              />
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors">
              <i className="fa-solid fa-bell text-lg"></i>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <span className="text-xs font-medium text-white bg-brand-deep px-2 py-1 rounded">
              {userRole}
            </span>
          </div>
        </div>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
