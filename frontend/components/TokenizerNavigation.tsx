import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

const tokenizerNavItems: NavItem[] = [
  { label: 'Overview', icon: 'fa-grid-2', path: '/tokenizer' },
  { label: 'My Properties', icon: 'fa-building', path: '/tokenizer/my-properties' },
  { label: 'Rental Income', icon: 'fa-money-bill-trend-up', path: '/tokenizer/rental-income' },
  { label: 'Token Holders', icon: 'fa-users', path: '/tokenizer/token-holders' },
  { label: 'Compliance', icon: 'fa-shield-check', path: '/tokenizer/compliance' },
  { label: 'Notifications', icon: 'fa-bell', path: '/tokenizer/notifications' },
];

export const TokenizerNavigation: React.FC = () => {
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

  const isActive = (path: string) => {
    if (path === '/tokenizer') {
      return location.pathname === '/tokenizer';
    }
    return location.pathname.startsWith(path);
  };

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
          <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-brand-mint/50 border border-brand-deep/20 rounded-lg">
            <i className="fa-solid fa-building text-brand-deep text-xs"></i>
            <span className="text-xs font-medium text-brand-deep">Tokenizer Portal</span>
          </div>
        </div>
        
        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {tokenizerNavItems.map((item) => (
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
          
          <div className="pt-4 mt-4 border-t border-brand-lightGray">
            <button
              onClick={() => navigate('/tokenizer/submit-property')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold bg-brand-deep text-white hover:bg-brand-dark transition-colors"
            >
              <i className="fa-solid fa-plus"></i>
              Submit Property
            </button>
          </div>
          
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors mt-2 ${
                location.pathname.startsWith('/admin')
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
                onClick={() => navigate('/tokenizer/settings')}
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

      {/* Mobile Demo Mode Banner */}
      {demoMode && (
        <div className="md:hidden fixed top-0 left-0 right-0 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 z-50">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
          <span className="text-xs font-medium text-amber-700">Demo Mode</span>
        </div>
      )}

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-brand-lightGray px-4 py-3 flex justify-between items-center z-50 pb-safe safe-area-bottom">
        <button
          onClick={() => navigate('/tokenizer')}
          className={`flex flex-col items-center gap-1 ${
            isActive('/tokenizer') && location.pathname === '/tokenizer' ? 'text-brand-deep' : 'text-brand-sage'
          }`}
        >
          <i className="fa-solid fa-grid-2 text-lg mb-1"></i>
          <span className="text-[10px] font-medium">Overview</span>
        </button>
        <button
          onClick={() => navigate('/tokenizer/my-properties')}
          className={`flex flex-col items-center gap-1 ${
            isActive('/tokenizer/my-properties') ? 'text-brand-deep' : 'text-brand-sage'
          }`}
        >
          <i className="fa-solid fa-building text-lg mb-1"></i>
          <span className="text-[10px] font-medium">Properties</span>
        </button>
        <button
          onClick={() => navigate('/tokenizer/rental-income')}
          className={`flex flex-col items-center gap-1 ${
            isActive('/tokenizer/rental-income') ? 'text-brand-deep' : 'text-brand-sage'
          }`}
        >
          <i className="fa-solid fa-money-bill-trend-up text-lg mb-1"></i>
          <span className="text-[10px] font-medium">Income</span>
        </button>
        <button
          onClick={() => navigate('/tokenizer/token-holders')}
          className={`flex flex-col items-center gap-1 ${
            isActive('/tokenizer/token-holders') ? 'text-brand-deep' : 'text-brand-sage'
          }`}
        >
          <i className="fa-solid fa-users text-lg mb-1"></i>
          <span className="text-[10px] font-medium">Holders</span>
        </button>
        <button
          onClick={() => navigate('/tokenizer/settings')}
          className={`flex flex-col items-center gap-1 ${
            isActive('/tokenizer/settings') ? 'text-brand-deep' : 'text-brand-sage'
          }`}
        >
          <i className="fa-solid fa-gear text-lg mb-1"></i>
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </div>
    </>
  );
};
