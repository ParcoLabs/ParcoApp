import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';
import { useDemo } from '../hooks/useDemo';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { demoMode, serverDemoEnabled, userDemoEnabled, toggleUserDemoMode } = useDemoMode();
  const { resetDemo, loading } = useDemo();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [localToggle, setLocalToggle] = useState(userDemoEnabled);

  React.useEffect(() => {
    setLocalToggle(userDemoEnabled);
  }, [userDemoEnabled]);

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
    console.log('Toggle clicked, setting local to:', newValue);
    setLocalToggle(newValue);
    setToggleLoading(true);
    
    const result = await toggleUserDemoMode(newValue);
    console.log('API result:', result);
    
    if (!result) {
      console.log('API failed, reverting local toggle');
      setLocalToggle(!newValue);
    }
    setToggleLoading(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SettingRow = ({ label, value, onClick }: { label: string, value?: string, onClick?: () => void }) => (
    <div 
        onClick={onClick}
        className="flex items-center justify-between py-4 cursor-pointer hover:bg-black/5 transition-colors group"
    >
      <span className="text-sm font-medium text-brand-dark group-hover:text-brand-deep transition-colors">{label}</span>
      <div className="flex items-center gap-3">
        {value && <span className="text-sm text-brand-sage font-medium">{value}</span>}
        <i className="fa-solid fa-chevron-right text-brand-sage/50 text-xs"></i>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-offWhite p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-center relative mb-8">
            <button onClick={() => window.history.back()} className="absolute left-0 text-brand-dark md:hidden">
                <i className="fa-solid fa-arrow-left text-xl"></i>
            </button>
            <h1 className="text-lg font-bold text-brand-dark">Settings</h1>
        </div>

        {/* General Section */}
        <div className="mb-8">
            <h2 className="font-bold text-brand-dark mb-2 text-lg px-2">General</h2>
            <div className="bg-white rounded-2xl border border-brand-lightGray px-4 shadow-sm">
                <div className="divide-y divide-brand-lightGray">
                    <SettingRow label="Set primary profile" value="2" />
                    <SettingRow label="Manage notifications" />
                </div>
            </div>
        </div>

        {/* Payment Methods */}
        <div className="mb-8">
            <h2 className="font-bold text-brand-dark mb-2 text-lg px-2">Payments</h2>
            <div className="bg-white rounded-2xl border border-brand-lightGray px-4 shadow-sm">
                <div className="divide-y divide-brand-lightGray">
                    <SettingRow label="Payment methods" onClick={() => navigate('/payment-methods')} />
                    <SettingRow label="Transaction history" onClick={() => navigate('/portfolio')} />
                </div>
            </div>
        </div>

        {/* Account Link */}
        <div className="mb-8">
             <div className="bg-white rounded-2xl border border-brand-lightGray px-4 shadow-sm">
                 <div className="divide-y divide-brand-lightGray">
                    <SettingRow label="Coinbase account" value="Connected" />
                 </div>
             </div>
        </div>
        
        {/* Invite */}
        <div className="mb-8">
             <div className="bg-white rounded-2xl border border-brand-lightGray px-4 shadow-sm">
                 <div className="divide-y divide-brand-lightGray">
                    <SettingRow label="Invite your friends" />
                 </div>
             </div>
        </div>

        {/* Display Section */}
        <div className="mb-8">
            <h2 className="font-bold text-brand-dark mb-2 text-lg px-2">Display</h2>
            <div className="bg-white rounded-2xl border border-brand-lightGray px-4 shadow-sm">
                <div className="divide-y divide-brand-lightGray">
                    <SettingRow label="Appearance" value="Light" />
                    <SettingRow label="Local currency" value="USD" />
                </div>
            </div>
        </div>

        {/* Demo Mode Section */}
        {serverDemoEnabled && (
          <div className="mb-8">
            <h2 className="font-bold text-amber-700 mb-2 text-lg px-2">Demo Mode</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4">
              {/* Toggle Switch */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-sm font-medium text-amber-800">Enable Demo Mode</span>
                  <p className="text-xs text-amber-600 mt-0.5">Use simulated blockchain and payments</p>
                </div>
                <button
                  onClick={handleToggleDemoMode}
                  disabled={toggleLoading}
                  style={{
                    backgroundColor: localToggle ? '#f59e0b' : '#d1d5db',
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
                  <div className="flex items-center gap-2 mb-3 pt-3 border-t border-amber-200">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                    <span className="text-sm font-medium text-amber-800">Demo environment is active</span>
                  </div>
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    disabled={loading}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Resetting...' : 'Reset Demo Environment'}
                  </button>
                  <p className="text-xs text-amber-700 mt-2 text-center">
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
            <div className="bg-white rounded-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-brand-dark mb-2">Reset Demo?</h3>
              <p className="text-sm text-brand-sage mb-4">
                This will reset your vault balance to $25,000 USDC and clear all holdings, transactions, and borrow positions.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 bg-gray-100 text-brand-dark font-bold py-2.5 rounded-lg hover:bg-gray-200 transition-colors"
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
            className="w-full bg-white border border-red-200 text-red-500 font-bold py-4 rounded-full hover:bg-red-50 transition-colors shadow-sm mb-8"
        >
            Sign out
        </button>
        
        <div className="text-center text-xs text-brand-sage pb-20">
            <p>Version 4.35.2</p>
            <p className="mt-1">{demoMode ? 'Demo Mode' : 'Production'}</p>
        </div>

      </div>
    </div>
  );
};
