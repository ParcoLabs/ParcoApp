
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

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

        {/* Sign Out */}
        <button 
            onClick={handleLogout}
            className="w-full bg-white border border-red-200 text-red-500 font-bold py-4 rounded-full hover:bg-red-50 transition-colors shadow-sm mb-8"
        >
            Sign out
        </button>
        
        <div className="text-center text-xs text-brand-sage pb-20">
            <p>Version 4.35.2</p>
            <p className="mt-1">Production</p>
        </div>

      </div>
    </div>
  );
};
