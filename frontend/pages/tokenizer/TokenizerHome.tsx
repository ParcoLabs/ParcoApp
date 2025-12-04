import React, { useState, useEffect } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { TokenizerPreDashboard } from './TokenizerPreDashboard';
import { TokenizerPostDashboard } from './TokenizerPostDashboard';

export const TokenizerHome: React.FC = () => {
  const { getToken } = useClerkAuth();
  const [viewMode, setViewMode] = useState<'pre' | 'post'>('post');
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
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep"></div>
        </div>
      </div>
    );
  }

  return viewMode === 'pre' ? <TokenizerPreDashboard /> : <TokenizerPostDashboard />;
};
