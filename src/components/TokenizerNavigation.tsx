import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';
import { useTheme } from '../context/ThemeContext';

interface TokenizerNavigationProps {
  viewMode?: 'pre' | 'post';
  propertyName?: string;
}

export const TokenizerNavigation: React.FC<TokenizerNavigationProps> = ({ 
  viewMode = 'post',
  propertyName = "Property Listing"
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { demoMode } = useDemoMode();
  const { isDark } = useTheme();
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

  const PreTokenizationNav = () => (
    <>
      <div className="p-6 border-b border-brand-lightGray dark:border-[#2a2a2a]">
        <div className="flex items-center gap-3 mb-4">
          <img 
            src="/brand/ParcoLogoGreen.png" 
            alt="Parco Logo" 
            className={`w-8 h-8 object-contain ${isDark ? 'brightness-0 invert' : ''}`}
          />
          <span className="text-xl font-logo text-brand-deep dark:text-white tracking-wider uppercase">Parco</span>
        </div>
        {demoMode && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Demo Mode</span>
          </div>
        )}
      </div>

      <div className="p-4 border-b border-brand-lightGray dark:border-[#2a2a2a]">
        <p className="text-xs text-brand-sage dark:text-gray-500 uppercase tracking-wide mb-1">Property Dashboard</p>
        <h2 className="text-sm font-bold text-brand-dark dark:text-white leading-tight">{propertyName}</h2>
      </div>

      <div className="flex-1 py-4 px-3 space-y-1">
        <button
          onClick={() => navigate('/tokenizer')}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive('/tokenizer') && location.pathname === '/tokenizer'
              ? 'bg-brand-mint dark:bg-brand-deep/30 text-brand-deep dark:text-brand-mint'
              : 'text-brand-sage dark:text-gray-400 hover:bg-brand-offWhite dark:hover:bg-[#1a1a1a] hover:text-brand-dark dark:hover:text-white'
          }`}
        >
          <i className="fa-solid fa-grid-2 w-5 text-center"></i>
          Overview
        </button>

        <div className="mt-4">
          <div className="border border-brand-deep dark:border-brand-mint rounded-lg p-2 mb-2">
            <p className="text-xs font-semibold text-brand-deep dark:text-brand-mint px-2 py-1 flex items-center gap-2">
              <i className="fa-solid fa-file-lines"></i>
              Test Application
            </p>
          </div>
          <button
            onClick={() => navigate('/tokenizer/application')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
              isActive('/tokenizer/application')
                ? 'bg-brand-mint dark:bg-brand-deep/30 text-brand-deep dark:text-brand-mint border-brand-deep dark:border-brand-mint'
                : 'text-brand-dark dark:text-white border-brand-sage/30 dark:border-[#3a3a3a] hover:bg-brand-offWhite dark:hover:bg-[#1a1a1a]'
            }`}
          >
            <i className="fa-regular fa-file w-5 text-center"></i>
            Application
          </button>
        </div>

        <button
          onClick={() => navigate('/tokenizer/help')}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-brand-sage dark:text-gray-400 hover:bg-brand-offWhite dark:hover:bg-[#1a1a1a] hover:text-brand-dark dark:hover:text-white transition-colors mt-4"
        >
          <i className="fa-solid fa-circle-question w-5 text-center"></i>
          Help
        </button>
      </div>

      <div className="p-4 border-t border-brand-lightGray dark:border-[#2a2a2a]">
        {user ? (
          <div 
            onClick={() => navigate('/tokenizer/settings')}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-brand-offWhite dark:hover:bg-[#1a1a1a] cursor-pointer group transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand-lightGray dark:bg-[#3a3a3a] flex items-center justify-center text-brand-dark dark:text-white font-bold">
              {user.firstName ? user.firstName[0] : 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-brand-dark dark:text-white truncate">{user.firstName} {user.lastName}</p>
              <p className="text-[10px] text-brand-sage dark:text-gray-500 truncate">{user.email}</p>
            </div>
            <i className="fa-solid fa-gear text-brand-sage dark:text-gray-500 group-hover:text-brand-deep dark:group-hover:text-brand-mint text-sm"></i>
          </div>
        ) : (
          <button onClick={() => navigate('/login')} className="w-full text-center text-sm font-semibold text-brand-deep dark:text-brand-mint">Sign In</button>
        )}
      </div>
    </>
  );

  const PostTokenizationNav = () => (
    <>
      <div className="p-6 border-b border-brand-lightGray dark:border-[#2a2a2a]">
        <div className="flex items-center gap-3">
          <img 
            src="/brand/ParcoLogoGreen.png" 
            alt="Parco Logo" 
            className={`w-10 h-10 object-contain ${isDark ? 'brightness-0 invert' : ''}`}
          />
          <span className="text-2xl font-logo text-brand-deep dark:text-white tracking-wider uppercase">Parco</span>
        </div>
        {demoMode && (
          <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Demo Mode</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <button
          onClick={() => navigate('/tokenizer')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            isActive('/tokenizer') && location.pathname === '/tokenizer'
              ? 'bg-brand-mint dark:bg-brand-deep/30 text-brand-deep dark:text-brand-mint'
              : 'text-brand-sage dark:text-gray-400 hover:bg-brand-offWhite dark:hover:bg-[#1a1a1a] hover:text-brand-dark dark:hover:text-white'
          }`}
        >
          <i className="fa-solid fa-grid-2 w-5 text-center"></i>
          Overview
        </button>

        <button
          onClick={() => navigate('/tokenizer/my-properties')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            isActive('/tokenizer/my-properties')
              ? 'bg-brand-mint dark:bg-brand-deep/30 text-brand-deep dark:text-brand-mint'
              : 'text-brand-sage dark:text-gray-400 hover:bg-brand-offWhite dark:hover:bg-[#1a1a1a] hover:text-brand-dark dark:hover:text-white'
          }`}
        >
          <i className="fa-regular fa-file w-5 text-center"></i>
          My Properties
        </button>

        <button
          onClick={() => navigate('/tokenizer/rental-income')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            isActive('/tokenizer/rental-income')
              ? 'bg-brand-mint dark:bg-brand-deep/30 text-brand-deep dark:text-brand-mint'
              : 'text-brand-sage dark:text-gray-400 hover:bg-brand-offWhite dark:hover:bg-[#1a1a1a] hover:text-brand-dark dark:hover:text-white'
          }`}
        >
          <i className="fa-solid fa-money-bill-trend-up w-5 text-center"></i>
          Rental Income & Distributions
        </button>

        <div className="space-y-0.5">
          <button
            onClick={() => navigate('/tokenizer/token-holders')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              isActive('/tokenizer/token-holders')
                ? 'bg-brand-mint dark:bg-brand-deep/30 text-brand-deep dark:text-brand-mint'
                : 'text-brand-sage dark:text-gray-400 hover:bg-brand-offWhite dark:hover:bg-[#1a1a1a] hover:text-brand-dark dark:hover:text-white'
            }`}
          >
            <i className="fa-solid fa-users w-5 text-center"></i>
            Token Holders
          </button>
          <div className="ml-9 pl-4 border-l-2 border-brand-lightGray dark:border-[#3a3a3a]">
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-brand-sage dark:text-gray-500 hover:text-brand-dark dark:hover:text-white transition-colors">
              <div className="w-2 h-2 rounded-full bg-brand-deep dark:bg-brand-mint"></div>
              Group D
            </button>
          </div>
        </div>

        <button
          onClick={() => navigate('/tokenizer/governance')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            isActive('/tokenizer/governance')
              ? 'bg-brand-deep text-white'
              : 'text-brand-sage dark:text-gray-400 hover:bg-brand-offWhite dark:hover:bg-[#1a1a1a] hover:text-brand-dark dark:hover:text-white'
          }`}
        >
          <i className="fa-solid fa-landmark w-5 text-center"></i>
          Governance
        </button>

        <button
          onClick={() => navigate('/tokenizer/compliance')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            isActive('/tokenizer/compliance')
              ? 'bg-brand-mint dark:bg-brand-deep/30 text-brand-deep dark:text-brand-mint'
              : 'text-brand-sage dark:text-gray-400 hover:bg-brand-offWhite dark:hover:bg-[#1a1a1a] hover:text-brand-dark dark:hover:text-white'
          }`}
        >
          <i className="fa-regular fa-file-lines w-5 text-center"></i>
          Compliance
        </button>

        <button
          onClick={() => navigate('/tokenizer/notifications')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            isActive('/tokenizer/notifications')
              ? 'bg-brand-mint dark:bg-brand-deep/30 text-brand-deep dark:text-brand-mint'
              : 'text-brand-sage dark:text-gray-400 hover:bg-brand-offWhite dark:hover:bg-[#1a1a1a] hover:text-brand-dark dark:hover:text-white'
          }`}
        >
          <i className="fa-regular fa-bell w-5 text-center"></i>
          Notifications
        </button>
        
        <div className="pt-4 mt-4 border-t border-brand-lightGray dark:border-[#2a2a2a]">
          <button
            onClick={() => navigate('/tokenizer/submit-property')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-bold bg-brand-deep text-white hover:bg-brand-dark transition-colors"
          >
            Submit Property
          </button>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors mt-2 ${
              location.pathname.startsWith('/admin')
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300'
            }`}
          >
            <i className="fa-solid fa-shield-halved w-5 text-center"></i>
            Admin
          </button>
        )}
      </div>

      <div className="p-4 border-t border-brand-lightGray dark:border-[#2a2a2a]">
         {user ? (
           <div 
              onClick={() => navigate('/tokenizer/settings')}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-brand-offWhite dark:hover:bg-[#1a1a1a] cursor-pointer group transition-colors"
           >
              <div className="w-8 h-8 rounded-full bg-brand-lightGray dark:bg-[#3a3a3a] flex items-center justify-center text-brand-dark dark:text-white font-bold">
                 {user.firstName ? user.firstName[0] : 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                 <p className="text-xs font-semibold text-brand-dark dark:text-white truncate">{user.firstName} {user.lastName}</p>
                 <p className="text-[10px] text-brand-sage dark:text-gray-500 truncate">{user.email}</p>
              </div>
              <i className="fa-solid fa-gear text-brand-sage dark:text-gray-500 group-hover:text-brand-deep dark:group-hover:text-brand-mint text-sm"></i>
           </div>
         ) : (
           <button onClick={() => navigate('/login')} className="w-full text-center text-sm font-semibold text-brand-deep dark:text-brand-mint">Sign In</button>
         )}
      </div>
    </>
  );

  return (
    <>
      <div className="hidden md:flex flex-col w-64 bg-white dark:bg-[#101010] border-r border-brand-lightGray dark:border-[#2a2a2a] h-screen fixed left-0 top-0 z-50 transition-colors">
        {viewMode === 'pre' ? <PreTokenizationNav /> : <PostTokenizationNav />}
      </div>

      {demoMode && (
        <div className="md:hidden fixed top-0 left-0 right-0 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-4 py-2 flex items-center justify-center gap-2 z-50">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Demo Mode</span>
        </div>
      )}

      {viewMode === 'pre' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#101010] border-t border-brand-lightGray dark:border-[#2a2a2a] px-6 py-3 flex justify-around items-center z-50 pb-safe safe-area-bottom transition-colors">
          <button
            onClick={() => navigate('/tokenizer')}
            className={`flex flex-col items-center gap-1 ${
              isActive('/tokenizer') && location.pathname === '/tokenizer' ? 'text-brand-deep dark:text-brand-mint' : 'text-brand-sage dark:text-gray-500'
            }`}
          >
            <i className="fa-solid fa-grid-2 text-lg mb-1"></i>
            <span className="text-[10px] font-medium">Overview</span>
          </button>
          <button
            onClick={() => navigate('/tokenizer/application')}
            className={`flex flex-col items-center gap-1 ${
              isActive('/tokenizer/application') ? 'text-brand-deep dark:text-brand-mint' : 'text-brand-sage dark:text-gray-500'
            }`}
          >
            <i className="fa-regular fa-file text-lg mb-1"></i>
            <span className="text-[10px] font-medium">Application</span>
          </button>
          <button
            onClick={() => navigate('/tokenizer/help')}
            className={`flex flex-col items-center gap-1 ${
              isActive('/tokenizer/help') ? 'text-brand-deep dark:text-brand-mint' : 'text-brand-sage dark:text-gray-500'
            }`}
          >
            <i className="fa-solid fa-circle-question text-lg mb-1"></i>
            <span className="text-[10px] font-medium">Help</span>
          </button>
          <button
            onClick={() => navigate('/tokenizer/settings')}
            className={`flex flex-col items-center gap-1 ${
              isActive('/tokenizer/settings') ? 'text-brand-deep dark:text-brand-mint' : 'text-brand-sage dark:text-gray-500'
            }`}
          >
            <i className="fa-solid fa-gear text-lg mb-1"></i>
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>
      )}

      {viewMode === 'post' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#101010] border-t border-brand-lightGray dark:border-[#2a2a2a] px-4 py-3 flex justify-between items-center z-50 pb-safe safe-area-bottom transition-colors">
          <button
            onClick={() => navigate('/tokenizer')}
            className={`flex flex-col items-center gap-1 ${
              isActive('/tokenizer') && location.pathname === '/tokenizer' ? 'text-brand-deep dark:text-brand-mint' : 'text-brand-sage dark:text-gray-500'
            }`}
          >
            <i className="fa-solid fa-grid-2 text-lg mb-1"></i>
            <span className="text-[10px] font-medium">Overview</span>
          </button>
          <button
            onClick={() => navigate('/tokenizer/my-properties')}
            className={`flex flex-col items-center gap-1 ${
              isActive('/tokenizer/my-properties') ? 'text-brand-deep dark:text-brand-mint' : 'text-brand-sage dark:text-gray-500'
            }`}
          >
            <i className="fa-solid fa-building text-lg mb-1"></i>
            <span className="text-[10px] font-medium">Properties</span>
          </button>
          <button
            onClick={() => navigate('/tokenizer/rental-income')}
            className={`flex flex-col items-center gap-1 ${
              isActive('/tokenizer/rental-income') ? 'text-brand-deep dark:text-brand-mint' : 'text-brand-sage dark:text-gray-500'
            }`}
          >
            <i className="fa-solid fa-money-bill-trend-up text-lg mb-1"></i>
            <span className="text-[10px] font-medium">Income</span>
          </button>
          <button
            onClick={() => navigate('/tokenizer/token-holders')}
            className={`flex flex-col items-center gap-1 ${
              isActive('/tokenizer/token-holders') ? 'text-brand-deep dark:text-brand-mint' : 'text-brand-sage dark:text-gray-500'
            }`}
          >
            <i className="fa-solid fa-users text-lg mb-1"></i>
            <span className="text-[10px] font-medium">Holders</span>
          </button>
          <button
            onClick={() => navigate('/tokenizer/settings')}
            className={`flex flex-col items-center gap-1 ${
              isActive('/tokenizer/settings') ? 'text-brand-deep dark:text-brand-mint' : 'text-brand-sage dark:text-gray-500'
            }`}
          >
            <i className="fa-solid fa-gear text-lg mb-1"></i>
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>
      )}
    </>
  );
};
