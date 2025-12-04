import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';

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
      <div className="p-6 border-b border-brand-lightGray">
        <div className="flex items-center gap-3 mb-4">
          <img src="/brand/ParcoLogoGreen.png" alt="Parco Logo" className="w-8 h-8 object-contain" />
          <span className="text-xl font-logo text-brand-deep tracking-wider uppercase">Parco</span>
        </div>
        {demoMode && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            <span className="text-xs font-medium text-amber-700">Demo Mode</span>
          </div>
        )}
      </div>

      <div className="p-4 border-b border-brand-lightGray">
        <p className="text-xs text-brand-sage uppercase tracking-wide mb-1">Property Dashboard</p>
        <h2 className="text-sm font-bold text-brand-dark leading-tight">{propertyName}</h2>
      </div>

      <div className="flex-1 py-4 px-3 space-y-1">
        <button
          onClick={() => navigate('/tokenizer')}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive('/tokenizer') && location.pathname === '/tokenizer'
              ? 'bg-brand-mint text-brand-deep'
              : 'text-brand-sage hover:bg-brand-offWhite hover:text-brand-dark'
          }`}
        >
          <i className="fa-solid fa-grid-2 w-5 text-center"></i>
          Overview
        </button>

        <div className="mt-4">
          <div className="border border-brand-deep rounded-lg p-2 mb-2">
            <p className="text-xs font-semibold text-brand-deep px-2 py-1 flex items-center gap-2">
              <i className="fa-solid fa-file-lines"></i>
              Test Application
            </p>
          </div>
          <button
            onClick={() => navigate('/tokenizer/application')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-brand-sage/30 ${
              isActive('/tokenizer/application')
                ? 'bg-brand-mint text-brand-deep border-brand-deep'
                : 'text-brand-dark hover:bg-brand-offWhite'
            }`}
          >
            <i className="fa-regular fa-file w-5 text-center"></i>
            Application
          </button>
        </div>

        <button
          onClick={() => navigate('/tokenizer/help')}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-brand-sage hover:bg-brand-offWhite hover:text-brand-dark transition-colors mt-4"
        >
          <i className="fa-solid fa-circle-question w-5 text-center"></i>
          Help
        </button>
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
    </>
  );

  const PostTokenizationNav = () => (
    <>
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
      
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <button
          onClick={() => navigate('/tokenizer')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            isActive('/tokenizer') && location.pathname === '/tokenizer'
              ? 'bg-brand-mint text-brand-deep'
              : 'text-brand-sage hover:bg-brand-offWhite hover:text-brand-dark'
          }`}
        >
          <i className="fa-solid fa-grid-2 w-5 text-center"></i>
          Overview
        </button>

        <button
          onClick={() => navigate('/tokenizer/my-properties')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            isActive('/tokenizer/my-properties')
              ? 'bg-brand-mint text-brand-deep'
              : 'text-brand-sage hover:bg-brand-offWhite hover:text-brand-dark'
          }`}
        >
          <i className="fa-regular fa-file w-5 text-center"></i>
          My Properties
        </button>

        <button
          onClick={() => navigate('/tokenizer/rental-income')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            isActive('/tokenizer/rental-income')
              ? 'bg-brand-mint text-brand-deep'
              : 'text-brand-sage hover:bg-brand-offWhite hover:text-brand-dark'
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
                ? 'bg-brand-mint text-brand-deep'
                : 'text-brand-sage hover:bg-brand-offWhite hover:text-brand-dark'
            }`}
          >
            <i className="fa-solid fa-users w-5 text-center"></i>
            Token Holders
          </button>
          <div className="ml-9 pl-4 border-l-2 border-brand-lightGray">
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-brand-sage hover:text-brand-dark transition-colors">
              <div className="w-2 h-2 rounded-full bg-brand-deep"></div>
              Group D
            </button>
          </div>
        </div>

        <button
          onClick={() => navigate('/tokenizer/governance')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            isActive('/tokenizer/governance')
              ? 'bg-brand-deep text-white'
              : 'text-brand-sage hover:bg-brand-offWhite hover:text-brand-dark'
          }`}
        >
          <i className="fa-solid fa-landmark w-5 text-center"></i>
          Governance
        </button>

        <button
          onClick={() => navigate('/tokenizer/compliance')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            isActive('/tokenizer/compliance')
              ? 'bg-brand-mint text-brand-deep'
              : 'text-brand-sage hover:bg-brand-offWhite hover:text-brand-dark'
          }`}
        >
          <i className="fa-regular fa-file-lines w-5 text-center"></i>
          Compliance
        </button>

        <button
          onClick={() => navigate('/tokenizer/notifications')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            isActive('/tokenizer/notifications')
              ? 'bg-brand-mint text-brand-deep'
              : 'text-brand-sage hover:bg-brand-offWhite hover:text-brand-dark'
          }`}
        >
          <i className="fa-regular fa-bell w-5 text-center"></i>
          Notifications
        </button>
        
        <div className="pt-4 mt-4 border-t border-brand-lightGray">
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
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-brand-lightGray h-screen fixed left-0 top-0 z-50">
        {viewMode === 'pre' ? <PreTokenizationNav /> : <PostTokenizationNav />}
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
