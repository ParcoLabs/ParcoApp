
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'Home', icon: 'fa-house', path: '/' },
  { label: 'Market', icon: 'fa-shop', path: '/marketplace' },
  { label: 'Portfolio', icon: 'fa-chart-pie', path: '/portfolio' },
  { label: 'DeFi', icon: 'fa-building-columns', path: '/defi' },
];

export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-brand-lightGray h-screen fixed left-0 top-0 z-50">
        <div className="p-6 border-b border-brand-lightGray flex items-center gap-3">
            {/* Logo SVG */}
            <div className="w-10 h-10">
               <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M50 5L93.3013 30V80L50 105L6.69873 80V30L50 5Z" fill="#056052"/>
                <path d="M50 15L85 35V75L50 95L15 75V35L50 15Z" fill="white"/>
                <path d="M50 25V85" stroke="#056052" strokeWidth="8" strokeLinecap="round"/>
                <rect x="42" y="30" width="16" height="50" rx="4" fill="#056052"/>
              </svg>
            </div>
            <span className="text-2xl font-logo text-brand-deep tracking-wider uppercase">Parco</span>
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

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-brand-lightGray px-6 py-3 flex justify-between items-center z-50 pb-safe safe-area-bottom">
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
         <button
            onClick={() => navigate('/settings')}
            className={`flex flex-col items-center gap-1 ${
                isActive('/settings') ? 'text-brand-deep' : 'text-brand-sage'
            }`}
          >
            <i className={`fa-solid fa-gear text-lg mb-1`}></i>
            <span className="text-[10px] font-medium">Settings</span>
          </button>
      </div>
    </>
  );
};
