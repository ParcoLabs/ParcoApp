import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoMode } from '../context/DemoModeContext';
import { useDemo } from '../hooks/useDemo';
import { useAuth } from '../context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import parcoLogo from '/brand/logo-green.svg';

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

const CRYPTO_ICONS: Record<string, { icon: string; color: string }> = {
  usdc: { icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', color: '#2775ca' },
  btc: { icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', color: '#f7931a' },
  parco: { icon: parcoLogo, color: '#41b39a' },
};

const DEMO_CHART_DATA = [
  { name: 'Jan', value: 24000 },
  { name: 'Feb', value: 24200 },
  { name: 'Mar', value: 24800 },
  { name: 'Apr', value: 25100 },
  { name: 'May', value: 25400 },
  { name: 'Jun', value: 25800 },
  { name: 'Jul', value: 25000 },
];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'properties' | 'crypto'>('properties');
  const { demoMode } = useDemoMode();
  const { setupDemoUser, runRentCycle, getPortfolioDetails, loading } = useDemo();
  const { user } = useAuth();
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (user?.role === 'TOKENIZER') {
      navigate('/tokenizer', { replace: true });
    } else if (user?.role === 'ADMIN') {
      navigate('/admin', { replace: true });
    }
  }, [user?.role, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (demoMode && user && !hasFetched) {
        setHasFetched(true);
        setIsLoading(true);
        await setupDemoUser();
        const data = await getPortfolioDetails();
        if (data) {
          setPortfolioData(data);
        }
        setIsLoading(false);
      } else if (!demoMode) {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [demoMode, user?.id, hasFetched]);

  if (user?.role === 'TOKENIZER' || user?.role === 'ADMIN') {
    return null;
  }

  const handleRunRentCycle = async () => {
    const result = await runRentCycle();
    if (result) {
      const data = await getPortfolioDetails();
      if (data) setPortfolioData(data);
    }
  };

  const summary = portfolioData?.summary || {
    totalBalance: 25000,
    totalPropertyValue: 12000,
    totalCryptoValue: 13000,
    totalInvested: 24000,
    netGains: 1000,
    netGainsPercent: 4.17,
    totalRentEarned: 0,
  };

  const properties = portfolioData?.properties || [];
  const walletBalances = portfolioData?.walletBalances || {
    usdc: { name: 'USDC', symbol: 'USDC', balance: 10000 },
    btc: { name: 'Bitcoin', symbol: 'BTC', balance: 2000 },
    parco: { name: 'Parco Token', symbol: 'PARCO', balance: 1000 },
  };
  const recentActivity = portfolioData?.recentActivity || [];

  if (demoMode) {
    if (isLoading) {
      return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-brand-lightGray rounded w-1/3"></div>
            <div className="h-48 bg-brand-lightGray rounded"></div>
            <div className="h-32 bg-brand-lightGray rounded"></div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <p className="text-xs text-brand-sage font-medium uppercase tracking-wide mb-1">Total Balance</p>
            <div className="flex items-baseline gap-3 mb-1">
              <h1 className="text-4xl font-bold text-brand-black">
                ${summary.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h1>
              <span className={`text-sm font-bold ${summary.netGains >= 0 ? 'text-brand-medium' : 'text-red-500'}`}>
                {summary.netGains >= 0 ? '+' : ''}${summary.netGains.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({summary.netGainsPercent.toFixed(2)}%)
              </span>
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
                <span className="font-bold text-brand-dark">${summary.totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-brand-sage">Earned to Date</span>
                <span className="font-bold text-brand-medium">+${summary.netGains.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-brand-sage">Rent Payouts</span>
                <span className="font-bold text-brand-medium">+${summary.totalRentEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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

          {activeTab === 'properties' ? (
            <div className="space-y-3">
              {properties.length > 0 ? (
                properties.map((prop: any) => (
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
                      <p className="font-bold text-brand-dark">${prop.totalValue.toLocaleString()}</p>
                      <p className={`text-xs font-bold ${prop.change >= 0 ? 'text-brand-medium' : 'text-red-500'}`}>
                        {prop.change > 0 ? '+' : ''}{prop.change.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white border border-brand-lightGray rounded-lg p-8 text-center">
                  <i className="fa-solid fa-building text-4xl text-brand-lightGray mb-3"></i>
                  <p className="text-brand-sage">No property tokens owned yet.</p>
                  <p className="text-brand-sage text-sm">Visit the Marketplace to buy property tokens.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(walletBalances).map(([key, crypto]: [string, any]) => (
                <div 
                  key={key}
                  className="bg-white border border-brand-lightGray rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${CRYPTO_ICONS[key]?.color || '#ccc'}15` }}
                    >
                      <img 
                        src={CRYPTO_ICONS[key]?.icon} 
                        alt={crypto.name} 
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-brand-dark">{crypto.name}</h3>
                      <p className="text-xs text-brand-sage">{crypto.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-brand-dark">${crypto.balance.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
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

        {recentActivity.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-brand-black mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((activity: any) => (
                <div key={activity.id} className="bg-white border border-brand-lightGray rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.positive ? 'bg-green-100 text-green-600' : 'bg-brand-lightGray text-brand-dark'
                    }`}>
                      <i className={`fa-solid ${
                        activity.type === 'RENT_DISTRIBUTION' ? 'fa-coins' :
                        activity.type === 'BUY' ? 'fa-shopping-cart' :
                        'fa-arrow-down'
                      }`}></i>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-brand-dark">
                        {activity.type === 'RENT_DISTRIBUTION' ? 'Rent Payout' : 
                         activity.type === 'BUY' ? 'Buy' : 
                         activity.type === 'DEPOSIT' ? 'Deposit' : activity.type}
                      </p>
                      <p className="text-xs text-brand-sage">
                        {new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {activity.asset}
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold ${activity.positive ? 'text-brand-medium' : 'text-brand-dark'}`}>
                    {activity.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-brand-black mb-1">
            $0.00
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
