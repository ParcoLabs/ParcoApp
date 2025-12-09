import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { BrandColors } from '../brand';
import { useDemoMode } from '../context/DemoModeContext';
import { useDemo } from '../hooks/useDemo';
import { useAuth } from '../context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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

const DEMO_OWNED_PROPERTIES = [
  {
    id: '1',
    title: '560 State St',
    location: 'New York, NY',
    value: 9500,
    change: '+8%',
    image: 'https://picsum.photos/200/200?random=1'
  },
  {
    id: '2',
    title: '88 Oakely Lane',
    location: 'New Orleans, LA',
    value: 870,
    change: '+2.4%',
    image: 'https://picsum.photos/200/200?random=2'
  }
];

const DEMO_CHART_DATA = [
  { name: 'Jan', value: 24000 },
  { name: 'Feb', value: 24200 },
  { name: 'Mar', value: 24800 },
  { name: 'Apr', value: 25100 },
  { name: 'May', value: 25400 },
  { name: 'Jun', value: 25800 },
  { name: 'Jul', value: 26354 },
];

const DEMO_ACTIVITY = [
  { type: 'rent', label: 'Rent Payout', detail: 'Sep 24 • 560 State St', amount: '+$45.10', positive: true },
  { type: 'buy', label: 'Buy', detail: 'Sep 18 • 88 Oakely Lane', amount: '-$500.00', positive: false },
  { type: 'deposit', label: 'Deposit', detail: 'Sep 15 • USDC', amount: '+$1,000.00', positive: true },
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
    if (user?.role === 'TOKENIZER') {
      navigate('/tokenizer', { replace: true });
    } else if (user?.role === 'ADMIN') {
      navigate('/admin', { replace: true });
    }
  }, [user?.role, navigate]);

  useEffect(() => {
    if (demoMode && user) {
      getDemoStatus().then(status => {
        if (status) setDemoStatus(status);
      });
    }
  }, [demoMode, user]);

  if (user?.role === 'TOKENIZER' || user?.role === 'ADMIN') {
    return null;
  }

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

  if (demoMode) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <p className="text-xs text-brand-sage font-medium uppercase tracking-wide mb-1">Total Balance</p>
            <div className="flex items-baseline gap-3 mb-1">
              <h1 className="text-4xl font-bold text-brand-black">$26,354.00</h1>
              <span className="text-brand-medium text-sm font-bold">+$1,254.00 (4.89%)</span>
              <span className="text-brand-sage text-xs">Past Month</span>
            </div>
            
            <div className="bg-white rounded-xl border border-brand-lightGray p-4 mt-4 h-48 min-h-[192px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={150}>
                <AreaChart data={DEMO_CHART_DATA}>
                  <defs>
                    <linearGradient id="colorValueDemo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#41b39a" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#41b39a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#7ebea6', fontSize: 11}} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#41b39a" strokeWidth={2} fillOpacity={1} fill="url(#colorValueDemo)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-brand-lightGray p-5">
            <h3 className="font-bold text-brand-dark mb-4">Your Performance</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-brand-sage">Net Invested</span>
                <span className="font-bold text-brand-dark">$25,100.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-brand-sage">Earned to Date</span>
                <span className="font-bold text-brand-medium">+$650.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-brand-sage">Rent Payouts</span>
                <span className="font-bold text-brand-medium">+$154.50</span>
              </div>
            </div>
            <button 
              onClick={() => navigate('/portfolio')}
              className="w-full mt-6 bg-brand-deep hover:bg-brand-dark text-white py-2.5 rounded-lg font-bold text-sm transition-all"
            >
              View Statements
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-brand-black mb-4">Assets</h2>
          <div className="flex gap-6 border-b border-brand-sage/30 mb-4">
            <button 
              onClick={() => setActiveTab('properties')}
              className={`pb-2 text-sm font-bold transition-colors ${
                activeTab === 'properties' ? 'text-brand-deep border-b-2 border-brand-deep' : 'text-brand-sage'
              }`}
            >
              Properties
            </button>
            <button 
              onClick={() => setActiveTab('crypto')}
              className={`pb-2 text-sm font-bold transition-colors ${
                activeTab === 'crypto' ? 'text-brand-deep border-b-2 border-brand-deep' : 'text-brand-sage'
              }`}
            >
              Crypto
            </button>
          </div>

          <div className="space-y-3">
            {DEMO_OWNED_PROPERTIES.map((prop) => (
              <div 
                key={prop.id}
                className="bg-white border border-brand-lightGray rounded-lg p-3 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/marketplace/${prop.id}`)}
              >
                <div className="flex items-center gap-4">
                  <img src={prop.image} alt={prop.title} className="w-12 h-12 object-cover rounded-lg bg-brand-lightGray" />
                  <div>
                    <h3 className="text-sm font-bold text-brand-dark">{prop.title}</h3>
                    <p className="text-xs text-brand-sage">{prop.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-dark">${prop.value.toLocaleString()}</p>
                  <p className="text-xs text-brand-medium font-bold">{prop.change}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-brand-black mb-4">Marketplace</h2>
          <div className="space-y-3">
            {PREVIEW_PROPERTIES.map((prop) => (
              <div 
                key={prop.id} 
                className="bg-white border border-brand-lightGray rounded-lg p-3 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/marketplace')}
              >
                <div className="flex items-center gap-4">
                  <img src={prop.image} alt={prop.title} className="w-12 h-12 object-cover rounded-lg bg-brand-lightGray" />
                  <div>
                    <h3 className="text-sm font-bold text-brand-dark">{prop.title}</h3>
                    <p className="text-xs text-brand-sage">{prop.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-brand-dark">Value: <span className="font-bold">${prop.value} USDC</span></p>
                  <p className="text-xs text-brand-dark">APY <span className="font-bold">({prop.apy}%)</span></p>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => navigate('/marketplace')}
            className="w-full mt-4 bg-brand-deep hover:bg-brand-dark text-white py-3 rounded-lg font-bold text-sm transition-all"
          >
            View Properties
          </button>
        </div>

        <div>
          <h2 className="text-xl font-bold text-brand-black mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {DEMO_ACTIVITY.map((activity, idx) => (
              <div key={idx} className="bg-white border border-brand-lightGray rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.type === 'rent' ? 'bg-green-100 text-green-600' :
                    activity.type === 'buy' ? 'bg-blue-100 text-blue-600' :
                    'bg-brand-mint text-brand-deep'
                  }`}>
                    <i className={`fa-solid ${
                      activity.type === 'rent' ? 'fa-coins' :
                      activity.type === 'buy' ? 'fa-shopping-cart' :
                      'fa-arrow-down'
                    }`}></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-brand-dark">{activity.label}</p>
                    <p className="text-xs text-brand-sage">{activity.detail}</p>
                  </div>
                </div>
                <span className={`font-bold ${activity.positive ? 'text-brand-medium' : 'text-brand-dark'}`}>
                  {activity.amount}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-brand-black mb-1">
            ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h1>
          <p className="text-brand-black text-sm font-bold tracking-wide uppercase">Total Property Value</p>
        </div>
        <div className="flex flex-col gap-2">
          <button 
            className="bg-brand-deep hover:bg-brand-dark text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm"
            onClick={() => navigate('/payment-methods')}
          >
            Add Funds
          </button>
          <button 
            className="bg-brand-deep hover:bg-brand-dark text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm"
            onClick={() => navigate('/kyc')}
          >
            Verify Identity
          </button>
        </div>
      </div>

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

      <div className="bg-white rounded-lg border border-brand-sage/20 shadow-sm h-48 flex items-center justify-center">
        <p className="text-brand-dark text-lg font-medium">No Properties to show</p>
      </div>

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
