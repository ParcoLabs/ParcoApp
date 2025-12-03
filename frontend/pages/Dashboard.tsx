import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandColors } from '../brand';
import { useDemoMode } from '../context/DemoModeContext';
import { useDemo } from '../hooks/useDemo';
import { useAuth } from '../context/AuthContext';

const PREVIEW_PROPERTIES = [
  {
    id: '1',
    title: '560 State St',
    location: 'New York',
    value: '870',
    apy: '10.8',
    image: 'https://picsum.photos/200/200?random=1'
  },
  {
    id: '2',
    title: '88 Oakely Lane',
    location: 'New Orleans',
    value: '870',
    apy: '10.8',
    image: 'https://picsum.photos/200/200?random=2'
  },
  {
    id: '3',
    title: '112 Biscayne Rd',
    location: 'Miami',
    value: '870',
    apy: '10.8',
    image: 'https://picsum.photos/200/200?random=3'
  }
];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'properties' | 'crypto'>('properties');
  const { demoMode } = useDemoMode();
  const { setupDemoUser, runRentCycle, getDemoStatus, loading, error } = useDemo();
  const { user, refreshUser } = useAuth();
  const [demoStatus, setDemoStatus] = useState<any>(null);
  const [rentResult, setRentResult] = useState<any>(null);
  const [showRentModal, setShowRentModal] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);

  useEffect(() => {
    if (demoMode && user) {
      getDemoStatus().then(status => {
        if (status) setDemoStatus(status);
      });
    }
  }, [demoMode, user]);

  const handleSetupDemo = async () => {
    setIsSettingUp(true);
    const result = await setupDemoUser();
    if (result) {
      const status = await getDemoStatus();
      if (status) setDemoStatus(status);
    }
    setIsSettingUp(false);
  };

  const handleRunRentCycle = async () => {
    const result = await runRentCycle();
    if (result) {
      setRentResult(result);
      setShowRentModal(true);
      const status = await getDemoStatus();
      if (status) setDemoStatus(status);
    }
  };

  const vaultBalance = demoStatus?.vault?.balance || 0;
  const portfolioValue = demoStatus?.portfolio?.totalValue || 0;
  const totalEarned = demoStatus?.vault?.totalEarned || 0;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      
      {/* Demo Mode Setup Banner */}
      {demoMode && !demoStatus?.vault?.balance && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-amber-800">Welcome to Demo Mode</h3>
              <p className="text-sm text-amber-700">Setup your demo account with $25,000 USDC and auto-approved KYC.</p>
            </div>
            <button
              onClick={handleSetupDemo}
              disabled={isSettingUp}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50"
            >
              {isSettingUp ? 'Setting Up...' : 'Start Demo'}
            </button>
          </div>
        </div>
      )}
      
      {/* Top Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-brand-black mb-1">
            ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h1>
          <p className="text-brand-black text-sm font-bold tracking-wide uppercase">Total Property Value</p>
          {demoMode && vaultBalance > 0 && (
            <p className="text-brand-sage text-xs mt-1">
              Vault Balance: ${vaultBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC
              {totalEarned > 0 && ` | Rent Earned: $${totalEarned.toFixed(2)}`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {demoMode && demoStatus?.vault?.balance > 0 && (
            <button 
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm"
              onClick={handleRunRentCycle}
              disabled={loading}
            >
              {loading ? 'Running...' : 'Run Rent Cycle'}
            </button>
          )}
          <button 
            className="bg-brand-deep hover:bg-brand-dark text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm"
            onClick={() => navigate('/kyc')}
          >
            Add Funds
          </button>
        </div>
      </div>

      {/* Rent Cycle Result Modal */}
      {showRentModal && rentResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brand-dark">Rent Distributed!</h3>
              <button onClick={() => setShowRentModal(false)} className="text-brand-sage hover:text-brand-dark">
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-2xl font-bold text-green-700">
                +${rentResult.totalDistributed.toFixed(2)} USDC
              </p>
              <p className="text-sm text-green-600">Total rent distributed this cycle</p>
            </div>
            <div className="space-y-2 mb-4">
              {rentResult.distributions.map((dist: any) => (
                <div key={dist.propertyId} className="flex justify-between text-sm">
                  <span className="text-brand-dark">{dist.propertyName}</span>
                  <span className="font-medium text-brand-deep">+${dist.rentAmount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-brand-sage">
              New vault balance: ${rentResult.vault.balance.toFixed(2)} USDC
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-8 border-b border-brand-sage/30">
        <button 
          onClick={() => setActiveTab('properties')}
          className={`pb-3 text-sm font-bold transition-colors relative ${
            activeTab === 'properties' 
              ? 'text-brand-deep border-b-2 border-brand-deep' 
              : 'text-brand-sage hover:text-brand-dark'
          }`}
        >
          Properties
        </button>
        <button 
          onClick={() => setActiveTab('crypto')}
          className={`pb-3 text-sm font-bold transition-colors relative ${
            activeTab === 'crypto' 
              ? 'text-brand-deep border-b-2 border-brand-deep' 
              : 'text-brand-sage hover:text-brand-dark'
          }`}
        >
          Crypto
        </button>
      </div>

      {/* Onboarding / Hero Card */}
      <div className="bg-white rounded-lg border border-brand-sage/20 shadow-sm h-64 flex items-center justify-center">
        <button 
          className="bg-brand-deep hover:bg-brand-dark text-white px-8 py-3 rounded-lg font-bold text-sm transition-all shadow-md"
          onClick={() => navigate('/kyc')}
        >
          Verify Identity
        </button>
      </div>

      {/* Marketplace Preview Section */}
      <div>
        <h2 className="text-xl font-bold text-brand-black mb-4">Marketplace</h2>
        
        <div className="space-y-4">
          {PREVIEW_PROPERTIES.map((prop) => (
            <div 
              key={prop.id} 
              className="bg-white border border-brand-sage/20 rounded-lg p-3 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate('/marketplace')}
            >
              <div className="flex items-center gap-4">
                <img 
                  src={prop.image} 
                  alt={prop.title} 
                  className="w-16 h-12 object-cover rounded-md bg-brand-lightGray"
                />
                <div>
                  <h3 className="text-sm font-bold text-brand-black">{prop.title}</h3>
                  <p className="text-xs text-brand-black font-medium">{prop.location}</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-xs text-brand-black font-medium">
                  Value: <span className="font-bold">${prop.value} USDC</span>
                </div>
                <div className="text-xs text-brand-black font-medium">
                  APY <span className="font-bold">({prop.apy}%)</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => navigate('/marketplace')}
          className="w-full mt-6 bg-brand-deep hover:bg-brand-dark text-white py-3.5 rounded-lg font-bold text-sm transition-all shadow-sm"
        >
          View Properties
        </button>
      </div>

    </div>
  );
};