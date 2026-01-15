import React, { createContext, useContext, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { TokenizerNavigation } from '../../components/TokenizerNavigation';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useTheme } from '../../context/ThemeContext';

interface TokenizerContextType {
  viewMode: 'pre' | 'post';
  setViewMode: (mode: 'pre' | 'post') => void;
  propertyName: string;
  setPropertyName: (name: string) => void;
}

const TokenizerContext = createContext<TokenizerContextType | undefined>(undefined);

export const useTokenizerContext = () => {
  const context = useContext(TokenizerContext);
  if (!context) {
    throw new Error('useTokenizerContext must be used within TokenizerLayout');
  }
  return context;
};

interface TokenizerHeaderProps {
  viewMode: 'pre' | 'post';
}

const TokenizerHeader: React.FC<TokenizerHeaderProps> = ({ viewMode }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  
  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-[#101010] border-b border-brand-lightGray dark:border-[#2a2a2a] z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/brand/ParcoLogoGreen.png" 
            alt="Parco Logo" 
            className={`w-8 h-8 object-contain ${isDark ? 'brightness-0 invert' : ''}`}
          />
          <span className="text-lg font-logo text-brand-deep dark:text-white tracking-wider uppercase">Parco</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 text-brand-sage dark:text-gray-400 hover:text-brand-dark dark:hover:text-white">
            <i className="fa-solid fa-bell text-lg"></i>
          </button>
          <button 
            onClick={() => navigate('/tokenizer/settings')}
            className="p-2 text-brand-sage dark:text-gray-400 hover:text-brand-dark dark:hover:text-white"
          >
            <i className="fa-solid fa-gear text-lg"></i>
          </button>
        </div>
      </div>

      {viewMode === 'pre' ? (
        <div className="hidden md:flex items-center justify-end gap-6 px-8 py-4 bg-white dark:bg-[#101010] border-b border-brand-lightGray dark:border-[#2a2a2a]">
          <button className="text-sm text-brand-sage dark:text-gray-400 hover:text-brand-dark dark:hover:text-white transition-colors font-medium">
            Alerts
          </button>
          <button 
            onClick={() => navigate('/tokenizer/settings')}
            className="text-sm text-brand-sage dark:text-gray-400 hover:text-brand-dark dark:hover:text-white transition-colors font-medium"
          >
            Settings
          </button>
        </div>
      ) : (
        <div className="hidden md:flex items-center justify-between px-8 py-4 bg-white dark:bg-[#101010] border-b border-brand-lightGray dark:border-[#2a2a2a]">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2 border border-brand-lightGray dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] rounded-lg text-sm text-brand-dark dark:text-white placeholder-brand-sage dark:placeholder-gray-500 focus:outline-none focus:border-brand-deep dark:focus:border-brand-mint"
              />
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-brand-sage dark:text-gray-500 text-sm"></i>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button className="text-sm text-brand-sage dark:text-gray-400 hover:text-brand-dark dark:hover:text-white transition-colors font-medium">
              Alerts
            </button>
            <button className="text-sm text-brand-sage dark:text-gray-400 hover:text-brand-dark dark:hover:text-white transition-colors font-medium">
              Help
            </button>
            <button 
              onClick={() => navigate('/tokenizer/settings')}
              className="text-sm text-brand-sage dark:text-gray-400 hover:text-brand-dark dark:hover:text-white transition-colors font-medium"
            >
              Settings
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const TokenizerLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { getToken } = useClerkAuth();
  const [viewMode, setViewMode] = useState<'pre' | 'post'>('post');
  const [propertyName, setPropertyName] = useState('Property Listing');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchViewMode();
  }, []);

  const fetchViewMode = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/user/tokenizer-view', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setViewMode(data.data?.tokenizerViewMode || 'post');
      }
    } catch (error) {
      console.error('Error fetching view mode:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#101010] flex items-center justify-center transition-colors">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep"></div>
      </div>
    );
  }

  return (
    <TokenizerContext.Provider value={{ viewMode, setViewMode, propertyName, setPropertyName }}>
      <div className="flex min-h-screen bg-white dark:bg-[#101010] overflow-x-hidden transition-colors">
        <TokenizerNavigation viewMode={viewMode} propertyName={propertyName} />
        <div className="flex-1 md:ml-64 pt-14 md:pt-0 pb-20 md:pb-0 flex flex-col min-h-screen w-full overflow-x-hidden">
          <TokenizerHeader viewMode={viewMode} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-white dark:bg-[#101010]">
            {children || <Outlet />}
          </main>
          {viewMode === 'pre' && (
            <footer className="hidden md:flex items-center justify-center gap-8 py-4 border-t border-brand-lightGray dark:border-[#2a2a2a] bg-white dark:bg-[#101010]">
              <span className="text-xs text-brand-sage dark:text-gray-500">© 2025 Parco Labs</span>
              <a href="#" className="text-xs text-brand-sage dark:text-gray-500 hover:text-brand-dark dark:hover:text-white">Contact Us</a>
              <a href="#" className="text-xs text-brand-sage dark:text-gray-500 hover:text-brand-dark dark:hover:text-white">Support</a>
              <a href="#" className="text-xs text-brand-sage dark:text-gray-500 hover:text-brand-dark dark:hover:text-white">FAQs</a>
              <a href="#" className="text-xs text-brand-sage dark:text-gray-500 hover:text-brand-dark dark:hover:text-white">Contact Us</a>
            </footer>
          )}
        </div>
      </div>
    </TokenizerContext.Provider>
  );
};
