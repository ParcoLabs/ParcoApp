import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';
import { useTheme } from '../context/ThemeContext';

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
  const { isDark, toggleTheme } = useTheme();
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
      <div className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-brand-lightGray dark:border-slate-700 h-screen fixed left-0 top-0 z-50 transition-colors">
        <div className="p-6 border-b border-brand-lightGray dark:border-slate-700">
          <div className="flex items-center gap-3">
            <img 
              src={isDark ? "/brand/ParcoLogoDark.jpg" : "/brand/ParcoLogoGreen.png"} 
              alt="Parco Logo" 
              className="w-10 h-10 object-contain rounded-lg" 
            />
            <span className="text-2xl font-logo text-brand-deep dark:text-white tracking-wider uppercase">Parco</span>
          </div>
          {demoMode && (
            <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Demo Mode</span>
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
                  ? 'bg-brand-mint dark:bg-slate-700 text-brand-deep dark:text-white'
                  : 'text-brand-sage dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-brand-dark dark:hover:text-white'
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
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300'
              }`}
            >
              <i className="fa-solid fa-shield-halved w-5 text-center"></i>
              Admin
            </button>
          )}
        </div>

        {/* Theme Toggle */}
        <div className="px-4 py-3 border-t border-brand-lightGray dark:border-slate-700">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium text-brand-sage dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="flex items-center gap-3">
              <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'} w-5 text-center`}></i>
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </span>
            <div className={`w-9 h-5 rounded-full transition-colors ${isDark ? 'bg-brand-deep' : 'bg-gray-300'} relative`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
            </div>
          </button>
        </div>

        <div className="p-4 border-t border-brand-lightGray dark:border-slate-700">
           {user ? (
             <div 
                onClick={() => navigate('/settings')}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer group transition-colors"
             >
                <div className="w-8 h-8 rounded-full bg-brand-lightGray dark:bg-slate-700 flex items-center justify-center text-brand-dark dark:text-white font-bold">
                   {user.firstName ? user.firstName[0] : 'U'}
                </div>
                <div className="flex-1 overflow-hidden">
                   <p className="text-xs font-semibold text-brand-dark dark:text-white truncate">{user.firstName} {user.lastName}</p>
                   <p className="text-[10px] text-brand-sage dark:text-slate-400 truncate">{user.email}</p>
                </div>
                <i className="fa-solid fa-gear text-brand-sage dark:text-slate-400 group-hover:text-brand-deep dark:group-hover:text-white text-sm"></i>
             </div>
           ) : (
             <button onClick={() => navigate('/login')} className="w-full text-center text-sm font-semibold text-brand-deep dark:text-brand-medium">Sign In</button>
           )}
        </div>
      </div>

      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-slate-900 border-b border-brand-lightGray dark:border-slate-700 px-4 py-3 flex items-center justify-between z-50 transition-colors">
        <button onClick={() => navigate('/')} className="flex items-center">
          <img 
            src={isDark ? "/brand/ParcoLogoDark.jpg" : "/brand/ParcoLogoGreen.png"} 
            alt="Parco Logo" 
            className="w-8 h-8 object-contain rounded-lg" 
          />
        </button>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className="p-2 text-brand-dark dark:text-white hover:text-brand-deep dark:hover:text-brand-medium transition-colors"
          >
            <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
          </button>
          <button 
            onClick={() => navigate('/settings')} 
            className="p-2 text-brand-dark dark:text-white hover:text-brand-deep dark:hover:text-brand-medium transition-colors"
          >
            <i className="fa-solid fa-bars text-xl"></i>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-brand-lightGray dark:border-slate-700 px-4 py-3 flex justify-around items-center z-50 pb-safe safe-area-bottom transition-colors">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 ${
              isActive(item.path) ? 'text-brand-deep dark:text-brand-medium' : 'text-brand-sage dark:text-slate-500'
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
