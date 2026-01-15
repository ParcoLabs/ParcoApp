import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDemoMode } from '../../context/DemoModeContext';
import { useTheme } from '../../context/ThemeContext';
import { useDemo } from '../../hooks/useDemo';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

export const TokenizerSettings: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { getToken } = useClerkAuth();
  const { demoMode, serverDemoEnabled, userDemoEnabled, toggleUserDemoMode } = useDemoMode();
  const { theme, toggleTheme, isDark } = useTheme();
  const { resetDemo, loading } = useDemo();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [localToggle, setLocalToggle] = useState(userDemoEnabled);
  const [viewMode, setViewMode] = useState<'pre' | 'post'>('post');
  const [viewModeLoading, setViewModeLoading] = useState(false);

  useEffect(() => {
    setLocalToggle(userDemoEnabled);
    fetchViewMode();
  }, [userDemoEnabled]);

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
    }
  };

  const handleViewModeToggle = async () => {
    const newMode = viewMode === 'post' ? 'pre' : 'post';
    setViewModeLoading(true);
    
    try {
      const token = await getToken();
      const response = await fetch('/api/user/tokenizer-view', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ viewMode: newMode })
      });

      if (response.ok) {
        setViewMode(newMode);
      }
    } catch (error) {
      console.error('Error updating view mode:', error);
    } finally {
      setViewModeLoading(false);
    }
  };

  const handleResetDemo = async () => {
    const result = await resetDemo();
    if (result) {
      setResetSuccess(true);
      setShowResetConfirm(false);
      setTimeout(() => setResetSuccess(false), 3000);
    }
  };

  const handleToggleDemoMode = async () => {
    const newValue = !localToggle;
    setLocalToggle(newValue);
    setToggleLoading(true);
    
    const result = await toggleUserDemoMode(newValue);
    
    if (!result) {
      setLocalToggle(!newValue);
    }
    setToggleLoading(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSwitchToInvestor = () => {
    navigate('/');
  };

  const SettingRow = ({ label, value, onClick }: { label: string, value?: string, onClick?: () => void }) => (
    <div 
        onClick={onClick}
        className="flex items-center justify-between py-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
    >
      <span className="text-sm font-medium text-brand-dark dark:text-white group-hover:text-brand-deep dark:group-hover:text-brand-medium transition-colors">{label}</span>
      <div className="flex items-center gap-3">
        {value && <span className="text-sm text-brand-sage dark:text-gray-400 font-medium">{value}</span>}
        <i className="fa-solid fa-chevron-right text-brand-sage/50 dark:text-gray-500 text-xs"></i>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#101010] p-4 md:p-8 pt-20 md:pt-8 pb-24 md:pb-8 transition-colors">
      <div className="max-w-2xl mx-auto">
        
        <div className="flex items-center justify-center relative mb-8">
            <button onClick={() => window.history.back()} className="absolute left-0 text-brand-dark dark:text-white md:hidden">
                <i className="fa-solid fa-arrow-left text-xl"></i>
            </button>
            <h1 className="text-lg font-bold text-brand-dark dark:text-white">Tokenizer Settings</h1>
        </div>

        <div className="mb-8">
            <h2 className="font-bold text-brand-dark dark:text-white mb-2 text-lg px-2">Account</h2>
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-brand-lightGray dark:border-[#3a3a3a] px-4 shadow-sm">
                <div className="divide-y divide-brand-lightGray dark:divide-slate-700">
                    <div 
                      onClick={handleSwitchToInvestor}
                      className="flex items-center justify-between py-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <i className="fa-solid fa-arrow-right-arrow-left text-brand-deep dark:text-brand-mint"></i>
                        <span className="text-sm font-medium text-brand-dark dark:text-white group-hover:text-brand-deep dark:group-hover:text-brand-medium transition-colors">
                          Switch to Investor Account
                        </span>
                      </div>
                      <i className="fa-solid fa-chevron-right text-brand-sage/50 dark:text-gray-500 text-xs"></i>
                    </div>
                </div>
            </div>
        </div>

        <div className="mb-8">
            <h2 className="font-bold text-brand-deep dark:text-brand-mint mb-2 text-lg px-2">Dashboard View</h2>
            <div className="bg-brand-mint/30 dark:bg-brand-deep/20 border border-brand-deep/20 dark:border-brand-mint/30 rounded-2xl px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-brand-dark dark:text-white">Pre-Tokenization View</span>
                  <p className="text-xs text-brand-sage dark:text-gray-400 mt-0.5">Show application progress and document checklist</p>
                </div>
                <button
                  onClick={handleViewModeToggle}
                  disabled={viewModeLoading}
                  style={{
                    backgroundColor: viewMode === 'pre' ? '#0d4f4a' : (isDark ? '#475569' : '#d1d5db'),
                    transition: 'background-color 0.2s ease-in-out',
                  }}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-brand-deep focus:ring-offset-2 ${
                    viewModeLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <span
                    style={{
                      transform: viewMode === 'pre' ? 'translateX(22px)' : 'translateX(4px)',
                      transition: 'transform 0.2s ease-in-out',
                    }}
                    className="inline-block h-5 w-5 rounded-full bg-white shadow-md"
                  />
                </button>
              </div>
              <p className="text-xs text-brand-sage dark:text-gray-400 mt-3 pt-3 border-t border-brand-deep/10 dark:border-brand-mint/20">
                {viewMode === 'pre' 
                  ? 'Currently showing pre-tokenization dashboard with progress tracking.' 
                  : 'Currently showing post-tokenization dashboard with property overview.'}
              </p>
            </div>
        </div>

        <div className="mb-8">
            <h2 className="font-bold text-brand-dark dark:text-white mb-2 text-lg px-2">General</h2>
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-brand-lightGray dark:border-[#3a3a3a] px-4 shadow-sm">
                <div className="divide-y divide-brand-lightGray dark:divide-slate-700">
                    <SettingRow label="Manage notifications" />
                    <SettingRow label="Property templates" />
                </div>
            </div>
        </div>

        <div className="mb-8">
            <h2 className="font-bold text-brand-dark dark:text-white mb-2 text-lg px-2">Display</h2>
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-brand-lightGray dark:border-[#3a3a3a] px-4 shadow-sm">
                <div className="divide-y divide-brand-lightGray dark:divide-slate-700">
                    <div className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <i className={`fa-solid ${isDark ? 'fa-moon' : 'fa-sun'} text-brand-sage dark:text-gray-400`}></i>
                        <span className="text-sm font-medium text-brand-dark dark:text-white">Appearance</span>
                      </div>
                      <button
                        onClick={toggleTheme}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                      >
                        <span className="text-sm font-medium text-brand-dark dark:text-white">
                          {isDark ? 'Dark' : 'Light'}
                        </span>
                        <div className={`w-9 h-5 rounded-full transition-colors ${isDark ? 'bg-brand-deep' : 'bg-gray-300'} relative`}>
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
                        </div>
                      </button>
                    </div>
                    <SettingRow label="Local currency" value="USD" />
                </div>
            </div>
        </div>

        {serverDemoEnabled && (
          <div className="mb-8">
            <h2 className="font-bold text-amber-700 dark:text-amber-400 mb-2 text-lg px-2">Demo Mode</h2>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Enable Demo Mode</span>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Use simulated blockchain and payments</p>
                </div>
                <button
                  onClick={handleToggleDemoMode}
                  disabled={toggleLoading}
                  style={{
                    backgroundColor: localToggle ? '#f59e0b' : (isDark ? '#475569' : '#d1d5db'),
                    transition: 'background-color 0.2s ease-in-out',
                  }}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                    toggleLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <span
                    style={{
                      transform: localToggle ? 'translateX(22px)' : 'translateX(4px)',
                      transition: 'transform 0.2s ease-in-out',
                    }}
                    className="inline-block h-5 w-5 rounded-full bg-white shadow-md"
                  />
                </button>
              </div>

              {demoMode && (
                <>
                  <div className="flex items-center gap-2 mb-3 pt-3 border-t border-amber-200 dark:border-amber-700">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Demo environment is active</span>
                  </div>
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    disabled={loading}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Resetting...' : 'Reset Demo Environment'}
                  </button>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 text-center">
                    This will reset your vault to $25,000 and clear all transactions
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-brand-dark dark:text-white mb-2">Reset Demo?</h3>
              <p className="text-sm text-brand-sage dark:text-gray-400 mb-4">
                This will reset your vault balance to $25,000 USDC and clear all holdings, transactions, and borrow positions.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 bg-gray-100 dark:bg-[#2a2a2a] text-brand-dark dark:text-white font-bold py-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetDemo}
                  disabled={loading}
                  className="flex-1 bg-amber-500 text-white font-bold py-2.5 rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Resetting...' : 'Reset'}
                </button>
              </div>
            </div>
          </div>
        )}

        {resetSuccess && (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            Demo environment has been reset!
          </div>
        )}

        <button 
            onClick={handleLogout}
            className="w-full bg-white dark:bg-[#1a1a1a] border border-red-200 dark:border-red-800 text-red-500 font-bold py-4 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm mb-8"
        >
            Sign out
        </button>
        
        <div className="text-center text-xs text-brand-sage dark:text-gray-500 pb-20">
            <p>Version 4.35.2</p>
            <p className="mt-1">{demoMode ? 'Demo Mode' : 'Production'} | Tokenizer Portal</p>
        </div>

      </div>
    </div>
  );
};
