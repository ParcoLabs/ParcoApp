import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

const baseNavItems: NavItem[] = [
  { label: 'Home', icon: 'fa-house', path: '/' },
  { label: 'Market', icon: 'fa-shop', path: '/marketplace' },
  { label: 'Portfolio', icon: 'fa-chart-pie', path: '/portfolio' },
  { label: 'DeFi', icon: 'fa-building-columns', path: '/defi' },
];

const demoNavItems: NavItem[] = [
  ...baseNavItems,
  { label: 'Governance', icon: 'fa-gavel', path: '/governance' },
];

export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { demoMode } = useDemoMode();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isAuthenticated) {
        setIsAdmin(false);
        return;
      }
      
      try {
        const response = await fetch('/api/admin/user/role', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin === true);
        }
      } catch (error) {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [isAuthenticated]);

  const navItems = demoMode ? demoNavItems : baseNavItems;
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-brand-lightGray h-screen fixed left-0 top-0 z-50">
        <div className="p-6 border-b border-brand-lightGray">
          <div className="flex items-center gap-3">
            <img src="/brand/ParcoLogoGreen.png" alt="Parco Logo" className="w-10 h-10 object-contain" />
            <span className="text-2xl font-logo text-brand-deep tracking-wider uppercase">Parco</span>
          </div>
          {demoMode && (
            <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
              <span className="text-xs font-medium text-amber-700">Demo Mode</span>
            </div>
          )}
        </div>
        
        <div className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'bg-brand-mint text-brand-deep'
                  : 'text-brand-sage hover:bg-brand-offWhite hover:text-brand-dark'
              }`}
            >
              <i className={`fa-solid ${item.icon} w-5 text-center`}></i>
              {item.label}
            </button>
          ))}
          
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive('/admin')
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-purple-600 hover:bg-purple-50 hover:text-purple-700'
              }`}
            >
              <i className="fa-solid fa-shield-halved w-5 text-center"></i>
              Admin
            </button>
          )}
        </div>

        <div className="p-4 border-t border-brand-lightGray">
           {user ? (
             <div 
                onClick={() => navigate('/settings')}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-brand-offWhite cursor-pointer group transition-colors"
             >
                <div className="w-8 h-8 rounded-full bg-brand-lightGray flex items-center justify-center text-brand-dark font-bold">
                   {user.firstName ? user.firstName[0] : 'U'}
                </div>
                <div className="flex-1 overflow-hidden">
                   <p className="text-xs font-semibold text-brand-dark truncate">{user.firstName} {user.lastName}</p>
                   <p className="text-[10px] text-brand-sage truncate">{user.email}</p>
                </div>
                <i className="fa-solid fa-gear text-brand-sage group-hover:text-brand-deep text-sm"></i>
             </div>
           ) : (
             <button onClick={() => navigate('/login')} className="w-full text-center text-sm font-semibold text-brand-deep">Sign In</button>
           )}
        </div>
      </div>

      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-brand-offWhite border-b border-brand-lightGray px-4 py-3 flex items-center justify-between z-50">
        <button onClick={() => navigate('/')} className="flex items-center">
          <img src="/brand/ParcoLogoGreen.png" alt="Parco Logo" className="w-8 h-8 object-contain" />
        </button>
        <button 
          onClick={() => navigate('/settings')} 
          className="p-2 text-brand-dark hover:text-brand-deep transition-colors"
        >
          <i className="fa-solid fa-bars text-xl"></i>
        </button>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-brand-lightGray px-4 py-3 flex justify-around items-center z-50 pb-safe safe-area-bottom">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 ${
              isActive(item.path) ? 'text-brand-deep' : 'text-brand-sage'
            }`}
          >
            <i className={`fa-solid ${item.icon} text-lg mb-1`}></i>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
};
