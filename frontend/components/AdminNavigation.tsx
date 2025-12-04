import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: 'fa-grid-2', path: '/admin' },
  { id: 'tokenizations', label: 'Tokenizations', icon: 'fa-file-contract', path: '/admin/tokenizations' },
  { id: 'properties', label: 'Properties', icon: 'fa-building', path: '/admin/properties' },
  { id: 'investors', label: 'Investors', icon: 'fa-users', path: '/admin/investors' },
  { id: 'rent', label: 'Rent Distribution', icon: 'fa-money-bill-wave', path: '/admin/rent' },
  { id: 'demo', label: 'Demo Tools', icon: 'fa-flask', path: '/admin/demo' },
];

export const AdminNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { demoMode } = useDemoMode();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-deep rounded-lg flex items-center justify-center">
            <i className="fa-solid fa-shield-halved text-white text-sm"></i>
          </div>
          <span className="text-lg font-logo text-brand-deep tracking-wider uppercase">Admin</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-brand-dark"
        >
          <i className={`fa-solid ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
        </button>
      </div>

      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 pt-16"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="bg-white w-64 h-full overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="py-4 px-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-brand-mint text-brand-deep'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <i className={`fa-solid ${item.icon} w-5 text-center`}></i>
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-auto p-4 border-t border-gray-200">
              <button
                onClick={() => handleNavigate('/')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <i className="fa-solid fa-arrow-left w-5 text-center"></i>
                Back to App
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed left-0 top-0 bottom-0 z-30">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-deep rounded-lg flex items-center justify-center">
              <i className="fa-solid fa-shield-halved text-white text-lg"></i>
            </div>
            <div>
              <span className="text-xl font-logo text-brand-deep tracking-wider uppercase block">Admin</span>
              <span className="text-xs text-gray-500">Control Panel</span>
            </div>
          </div>
          {demoMode && (
            <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
              <span className="text-xs font-medium text-amber-700">Demo Mode</span>
            </div>
          )}
        </div>

        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.path)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'bg-brand-mint text-brand-deep'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <i className={`fa-solid ${item.icon} w-5 text-center`}></i>
              {item.label}
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-gray-200">
            <button
              onClick={() => handleNavigate('/')}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <i className="fa-solid fa-arrow-left w-5 text-center"></i>
              Back to App
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          {user ? (
            <div 
              onClick={() => handleNavigate('/settings')}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer group transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-brand-deep flex items-center justify-center text-white font-bold text-sm">
                {user.firstName ? user.firstName[0] : 'A'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold text-gray-900 truncate">{user.firstName} {user.lastName}</p>
                <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
              </div>
              <span className="text-[10px] font-medium text-white bg-brand-deep px-1.5 py-0.5 rounded">
                ADMIN
              </span>
            </div>
          ) : (
            <button onClick={() => navigate('/login')} className="w-full text-center text-sm font-semibold text-brand-deep">
              Sign In
            </button>
          )}
        </div>
      </aside>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-2 py-2 safe-area-pb">
        <div className="flex justify-around items-center">
          {navItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.path)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg min-w-[56px] ${
                isActive(item.path)
                  ? 'text-brand-deep'
                  : 'text-gray-400'
              }`}
            >
              <i className={`fa-solid ${item.icon} text-lg`}></i>
              <span className="text-[10px] font-medium truncate max-w-[56px]">{item.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
