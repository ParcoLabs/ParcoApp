import React, { createContext, useContext, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { TokenizerNavigation } from '../../components/TokenizerNavigation';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

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
  
  if (viewMode === 'pre') {
    return (
      <div className="hidden md:flex items-center justify-end gap-6 px-8 py-4 bg-white border-b border-brand-lightGray">
        <button className="text-sm text-brand-sage hover:text-brand-dark transition-colors font-medium">
          Alerts
        </button>
        <button 
          onClick={() => navigate('/tokenizer/settings')}
          className="text-sm text-brand-sage hover:text-brand-dark transition-colors font-medium"
        >
          Settings
        </button>
      </div>
    );
  }

  return (
    <div className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-brand-lightGray">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-10 pr-4 py-2 border border-brand-lightGray rounded-lg text-sm focus:outline-none focus:border-brand-deep"
          />
          <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-brand-sage text-sm"></i>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <button className="text-sm text-brand-sage hover:text-brand-dark transition-colors font-medium">
          Alerts
        </button>
        <button className="text-sm text-brand-sage hover:text-brand-dark transition-colors font-medium">
          Help
        </button>
        <button 
          onClick={() => navigate('/tokenizer/settings')}
          className="text-sm text-brand-sage hover:text-brand-dark transition-colors font-medium"
        >
          Settings
        </button>
      </div>
    </div>
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
      <div className="min-h-screen bg-brand-offWhite flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep"></div>
      </div>
    );
  }

  return (
    <TokenizerContext.Provider value={{ viewMode, setViewMode, propertyName, setPropertyName }}>
      <div className="flex min-h-screen bg-brand-offWhite">
        <TokenizerNavigation viewMode={viewMode} propertyName={propertyName} />
        <div className="flex-1 md:ml-64 pb-20 md:pb-0 flex flex-col h-screen">
          <TokenizerHeader viewMode={viewMode} />
          <main className="flex-1 overflow-y-auto">
            {children || <Outlet />}
          </main>
          {viewMode === 'pre' && (
            <footer className="hidden md:flex items-center justify-center gap-8 py-4 border-t border-brand-lightGray bg-white">
              <span className="text-xs text-brand-sage">© 2025 Parco Labs</span>
              <a href="#" className="text-xs text-brand-sage hover:text-brand-dark">Contact Us</a>
              <a href="#" className="text-xs text-brand-sage hover:text-brand-dark">Support</a>
              <a href="#" className="text-xs text-brand-sage hover:text-brand-dark">FAQs</a>
              <a href="#" className="text-xs text-brand-sage hover:text-brand-dark">Contact Us</a>
            </footer>
          )}
        </div>
      </div>
    </TokenizerContext.Provider>
  );
};
