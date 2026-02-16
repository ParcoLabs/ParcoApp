import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';
import { useTheme } from '../context/ThemeContext';
import { useDemo } from '../hooks/useDemo';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { demoMode, serverDemoEnabled, userDemoEnabled, toggleUserDemoMode } = useDemoMode();
  const { theme, toggleTheme, isDark } = useTheme();
  const { resetDemo, loading } = useDemo();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [localToggle, setLocalToggle] = useState(userDemoEnabled);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletSaving, setWalletSaving] = useState(false);
  const [walletMessage, setWalletMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [walletLoaded, setWalletLoaded] = useState(false);

  React.useEffect(() => {
    setLocalToggle(userDemoEnabled);
  }, [userDemoEnabled]);

  React.useEffect(() => {
    const fetchWallet = async () => {
      try {
        const response = await fetch('/api/user/wallet', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setWalletAddress(data.data?.walletAddress || '');
        }
      } catch {
      } finally {
        setWalletLoaded(true);
      }
    };
    fetchWallet();
  }, []);

  React.useEffect(() => {
    if (walletLoaded && demoMode && !walletAddress) {
      setWalletAddress('0x' + 'a1b2c3d4e5f6'.repeat(3).slice(0, 38) + 'D0');
    }
  }, [walletLoaded, demoMode]);

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

  const handleSaveWallet = async () => {
    setWalletSaving(true);
    setWalletMessage(null);
    try {
      const response = await fetch('/api/user/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ walletAddress: walletAddress.trim() || null }),
      });
      const data = await response.json();
      if (response.ok) {
        setWalletMessage({ text: 'Wallet address saved', type: 'success' });
        setTimeout(() => setWalletMessage(null), 3000);
      } else {
        setWalletMessage({ text: data.error || 'Failed to save', type: 'error' });
      }
    } catch {
      setWalletMessage({ text: 'Network error', type: 'error' });
    } finally {
      setWalletSaving(false);
    }
  };

  const [kycStatus, setKycStatus] = useState('NOT_STARTED');
  const [accreditationStatus, setAccreditationStatus] = useState('NOT_REQUIRED');
  const [kycLoading, setKycLoading] = useState(false);
  const [accreditationLoading, setAccreditationLoading] = useState(false);
  const [complianceLoaded, setComplianceLoaded] = useState(false);

  React.useEffect(() => {
    const fetchCompliance = async () => {
      try {
        const res = await fetch('/api/compliance/status', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setKycStatus(data.data?.kycStatus || 'NOT_STARTED');
          setAccreditationStatus(data.data?.accreditationStatus || 'NOT_REQUIRED');
        }
      } catch {}
      setComplianceLoaded(true);
    };
    fetchCompliance();
  }, []);

  const handleStartKyc = async () => {
    setKycLoading(true);
    try {
      if (demoMode) {
        const res = await fetch('/api/compliance/demo/toggle', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kycStatus: kycStatus === 'APPROVED' ? 'NOT_STARTED' : 'APPROVED' }),
        });
        if (res.ok) {
          const data = await res.json();
          setKycStatus(data.data?.kycStatus || 'NOT_STARTED');
        }
      } else {
        const res = await fetch('/api/compliance/kyc/start', {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setKycStatus(data.data?.kycStatus || 'PENDING');
        }
      }
    } catch {}
    setKycLoading(false);
  };

  const handleStartAccreditation = async () => {
    setAccreditationLoading(true);
    try {
      if (demoMode) {
        const res = await fetch('/api/compliance/demo/toggle', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accreditationStatus: accreditationStatus === 'APPROVED' ? 'NOT_REQUIRED' : 'APPROVED' }),
        });
        if (res.ok) {
          const data = await res.json();
          setAccreditationStatus(data.data?.accreditationStatus || 'NOT_REQUIRED');
        }
      } else {
        const res = await fetch('/api/compliance/accreditation/start', {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setAccreditationStatus(data.data?.accreditationStatus || 'PENDING');
        }
      }
    } catch {}
    setAccreditationLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      NOT_STARTED: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: 'Not Started' },
      NOT_REQUIRED: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: 'Not Required' },
      PENDING: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Pending' },
      APPROVED: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Verified' },
      REJECTED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Rejected' },
    };
    const config = map[status] || map.NOT_STARTED;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>{config.label}</span>;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SettingRow = ({ label, value, onClick }: { label: string, value?: string, onClick?: () => void }) => (
    <div 
        onClick={onClick}
        className="flex items-center justify-between py-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
    >
      <span className="text-sm font-medium text-brand-dark dark:text-white group-hover:text-brand-deep dark:group-hover:text-brand-medium dark:text-brand-mint transition-colors">{label}</span>
      <div className="flex items-center gap-3">
        {value && <span className="text-sm text-brand-sage dark:text-gray-400 font-medium">{value}</span>}
        <i className="fa-solid fa-chevron-right text-brand-sage/50 dark:text-gray-500 text-xs"></i>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#101010] p-4 md:p-8 pt-20 md:pt-8 pb-24 md:pb-8 transition-colors">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-center relative mb-8">
            <button onClick={() => window.history.back()} className="absolute left-0 text-brand-dark dark:text-white md:hidden">
                <i className="fa-solid fa-arrow-left text-xl"></i>
            </button>
            <h1 className="text-lg font-bold text-brand-dark dark:text-white">Settings</h1>
        </div>

        {/* General Section */}
        <div className="mb-8">
            <h2 className="font-bold text-brand-dark dark:text-white mb-2 text-lg px-2">General</h2>
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-brand-lightGray dark:border-[#3a3a3a] px-4 shadow-sm">
                <div className="divide-y divide-brand-lightGray dark:divide-slate-700">
                    <SettingRow label="Set primary profile" value="2" />
                    <SettingRow label="Manage notifications" />
                </div>
            </div>
        </div>

        {/* Wallet Section */}
        <div className="mb-8">
            <h2 className="font-bold text-brand-dark dark:text-white mb-2 text-lg px-2">Blockchain Wallet</h2>
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-brand-lightGray dark:border-[#3a3a3a] px-4 py-4 shadow-sm">
                <p className="text-xs text-brand-sage dark:text-gray-400 mb-3">
                  Your Ethereum-compatible wallet address for receiving property tokens and allowlist access.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0x..."
                    className="flex-1 px-3 py-2 rounded-lg border border-brand-lightGray dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#252525] text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-deep font-mono"
                  />
                  <button
                    onClick={handleSaveWallet}
                    disabled={walletSaving}
                    className="px-4 py-2 bg-brand-deep text-white text-sm font-bold rounded-lg hover:bg-brand-deep/90 transition-colors disabled:opacity-50"
                  >
                    {walletSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                {walletMessage && (
                  <p className={`text-xs mt-2 ${walletMessage.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                    {walletMessage.text}
                  </p>
                )}
            </div>
        </div>

        {/* Verification Section */}
        <div className="mb-8">
            <h2 className="font-bold text-brand-dark dark:text-white mb-2 text-lg px-2">Verification</h2>
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-brand-lightGray dark:border-[#3a3a3a] px-4 py-4 shadow-sm">
                <p className="text-xs text-brand-sage dark:text-gray-400 mb-4">
                  Complete identity verification (KYC) and accreditation to access all investment opportunities.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${kycStatus === 'APPROVED' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        <i className={`fa-solid fa-id-card text-sm ${kycStatus === 'APPROVED' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}></i>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-brand-dark dark:text-white">Identity (KYC)</p>
                        <div className="mt-0.5">{getStatusBadge(kycStatus)}</div>
                      </div>
                    </div>
                    <button
                      onClick={handleStartKyc}
                      disabled={kycLoading || kycStatus === 'PENDING'}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                        kycStatus === 'APPROVED'
                          ? (demoMode ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200' : 'bg-green-100 dark:bg-green-900/30 text-green-700 cursor-default')
                          : 'bg-brand-deep text-white hover:bg-brand-deep/90'
                      }`}
                    >
                      {kycLoading ? '...' : kycStatus === 'APPROVED' ? (demoMode ? 'Reset' : 'Verified') : kycStatus === 'PENDING' ? 'Pending' : 'Verify'}
                    </button>
                  </div>

                  <div className="border-t border-brand-lightGray dark:border-[#3a3a3a]"></div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${accreditationStatus === 'APPROVED' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        <i className={`fa-solid fa-certificate text-sm ${accreditationStatus === 'APPROVED' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}></i>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-brand-dark dark:text-white">Accredited Investor</p>
                        <div className="mt-0.5">{getStatusBadge(accreditationStatus)}</div>
                      </div>
                    </div>
                    <button
                      onClick={handleStartAccreditation}
                      disabled={accreditationLoading || accreditationStatus === 'PENDING'}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                        accreditationStatus === 'APPROVED'
                          ? (demoMode ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200' : 'bg-green-100 dark:bg-green-900/30 text-green-700 cursor-default')
                          : 'bg-brand-deep text-white hover:bg-brand-deep/90'
                      }`}
                    >
                      {accreditationLoading ? '...' : accreditationStatus === 'APPROVED' ? (demoMode ? 'Reset' : 'Verified') : accreditationStatus === 'PENDING' ? 'Pending' : 'Verify'}
                    </button>
                  </div>
                </div>

                {demoMode && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-3">
                    <i className="fa-solid fa-flask mr-1"></i>
                    Demo mode: Click Verify/Reset to toggle statuses instantly
                  </p>
                )}
            </div>
        </div>

        {/* Payment Methods */}
        <div className="mb-8">
            <h2 className="font-bold text-brand-dark dark:text-white mb-2 text-lg px-2">Payments</h2>
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-brand-lightGray dark:border-[#3a3a3a] px-4 shadow-sm">
                <div className="divide-y divide-brand-lightGray dark:divide-slate-700">
                    <SettingRow label="Payment methods" onClick={() => navigate('/payment-methods')} />
                    <SettingRow label="Transaction history" onClick={() => navigate('/portfolio')} />
                </div>
            </div>
        </div>

        {/* Account Link */}
        <div className="mb-8">
             <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-brand-lightGray dark:border-[#3a3a3a] px-4 shadow-sm">
                 <div className="divide-y divide-brand-lightGray dark:divide-slate-700">
                    <SettingRow label="Coinbase account" value="Connected" />
                 </div>
             </div>
        </div>
        
        {/* Invite */}
        <div className="mb-8">
             <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-brand-lightGray dark:border-[#3a3a3a] px-4 shadow-sm">
                 <div className="divide-y divide-brand-lightGray dark:divide-slate-700">
                    <SettingRow label="Invite your friends" />
                 </div>
             </div>
        </div>

        {/* Display Section with Theme Toggle */}
        <div className="mb-8">
            <h2 className="font-bold text-brand-dark dark:text-white mb-2 text-lg px-2">Display</h2>
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-brand-lightGray dark:border-[#3a3a3a] px-4 shadow-sm">
                <div className="divide-y divide-brand-lightGray dark:divide-slate-700">
                    {/* Theme Toggle Row */}
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

        {/* Demo Mode Section */}
        {serverDemoEnabled && (
          <div className="mb-8">
            <h2 className="font-bold text-amber-700 dark:text-amber-400 mb-2 text-lg px-2">Demo Mode</h2>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl px-4 py-4">
              {/* Toggle Switch */}
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

              {/* Active indicator and reset button - only show when demo is active */}
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

        {/* Reset Confirmation Modal */}
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

        {/* Reset Success Toast */}
        {resetSuccess && (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            Demo environment has been reset!
          </div>
        )}

        {/* Sign Out */}
        <button 
            onClick={handleLogout}
            className="w-full bg-white dark:bg-[#1a1a1a] border border-red-200 dark:border-red-800 text-red-500 font-bold py-4 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm mb-8"
        >
            Sign out
        </button>
        
        <div className="text-center text-xs text-brand-sage dark:text-gray-500 pb-20">
            <p>Version 4.35.2</p>
            <p className="mt-1">{demoMode ? 'Demo Mode' : 'Production'} | {isDark ? 'Dark' : 'Light'} Theme</p>
        </div>

      </div>
    </div>
  );
};
