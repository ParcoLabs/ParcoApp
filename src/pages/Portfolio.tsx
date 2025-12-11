import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, Tooltip, ResponsiveContainer, XAxis } from 'recharts';
import { useDemoMode } from '../context/DemoModeContext';
import { useDemoPortfolio } from '../context/DemoPortfolioContext';
import { useDemo } from '../hooks/useDemo';
import parcoLogo from '/brand/logo-green.svg';

const CRYPTO_ICONS: Record<string, { icon: string; color: string }> = {
  usdc: { icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', color: '#2775ca' },
  btc: { icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', color: '#f7931a' },
  parco: { icon: parcoLogo, color: '#41b39a' },
};

export const Portfolio: React.FC = () => {
  const [timeframe, setTimeframe] = useState('1M');
  const [assetTab, setAssetTab] = useState<'properties' | 'crypto'>('properties');
  const { demoMode } = useDemoMode();
  const { setupDemoUser } = useDemo();
  const { 
    summary, 
    walletBalances, 
    properties, 
    recentActivity,
    portfolioChartData,
    loading,
    refreshPortfolio 
  } = useDemoPortfolio();
  const [hasSetup, setHasSetup] = useState(false);

  useEffect(() => {
    const setup = async () => {
      if (demoMode && !hasSetup) {
        setHasSetup(true);
        await setupDemoUser();
      }
    };
    setup();
  }, [demoMode, hasSetup, setupDemoUser]);

  if (!demoMode) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto pt-20 md:pt-8">
        <div className="text-center py-16">
          <i className="fa-solid fa-chart-pie text-6xl text-brand-lightGray mb-4"></i>
          <h2 className="text-2xl font-bold text-brand-dark dark:text-white mb-2">Portfolio</h2>
          <p className="text-brand-sage dark:text-gray-400">Enable demo mode in settings to view portfolio data.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto pt-20 md:pt-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-brand-lightGray dark:bg-[#2a2a2a] rounded w-1/3"></div>
          <div className="h-64 bg-brand-lightGray dark:bg-[#2a2a2a] rounded"></div>
          <div className="h-48 bg-brand-lightGray dark:bg-[#2a2a2a] rounded"></div>
        </div>
      </div>
    );
  }

  const totalPortfolioValue = summary.totalPropertyValue + 
    (walletBalances.usdc?.balance || 0) + 
    (walletBalances.btc?.balance || 0) + 
    (walletBalances.parco?.balance || 0);
  
  const chartData = portfolioChartData.length > 0 ? portfolioChartData.map(p => ({ name: p.name, v: p.value })) : [
    { name: 'Now', v: totalPortfolioValue }
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pt-20 md:pt-8 pb-24">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
           <div>
              <p className="text-brand-sage dark:text-gray-400 font-bold text-sm uppercase tracking-wide mb-1">Total Balance</p>
              <h1 className="text-4xl md:text-5xl font-bold text-brand-dark dark:text-white mb-2">
                ${totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h1>
              <div className="flex items-center gap-2 text-sm font-bold">
                 <span className={summary.netGains >= 0 ? 'text-brand-medium' : 'text-red-500'}>
                   {summary.netGains >= 0 ? '+' : ''}${summary.netGains.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({summary.netGainsPercent.toFixed(2)}%)
                 </span>
                 <span className="text-brand-sage dark:text-gray-400 px-2 bg-white dark:bg-[#101010] rounded-full">Past Month</span>
              </div>
           </div>

           <div className="h-64 md:h-80 w-full -ml-2">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#41b39a" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#41b39a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#7ebea6', fontSize: 11}} />
                  <Tooltip 
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                     itemStyle={{ color: '#173726', fontWeight: 'bold' }}
                     formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                  />
                  <Area type="monotone" dataKey="v" stroke="#41b39a" strokeWidth={3} fill="url(#colorV)" />
                </AreaChart>
             </ResponsiveContainer>
           </div>

           <div className="flex gap-2 border-b border-brand-lightGray dark:border-[#3a3a3a] pb-4">
              {['1H', '1D', '1W', '1M', '1Y', 'All'].map(tf => (
                 <button 
                   key={tf}
                   onClick={() => setTimeframe(tf)}
                   className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      timeframe === tf 
                      ? 'bg-brand-lightGray dark:bg-[#2a2a2a] text-brand-deep' 
                      : 'text-brand-sage dark:text-gray-400 hover:text-brand-dark dark:text-white hover:bg-white dark:bg-[#1a1a1a]'
                   }`}
                 >
                   {tf}
                 </button>
              ))}
           </div>
        </div>

        <div className="hidden lg:block space-y-6">
           <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#3a3a3a] rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-brand-dark dark:text-white mb-4">Your Performance</h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center pb-3 border-b border-brand-lightGray dark:border-[#3a3a3a]">
                    <span className="text-brand-sage dark:text-gray-400 text-sm font-medium">Net Invested</span>
                    <span className="text-brand-dark dark:text-white font-bold">${summary.totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                 </div>
                 <div className="flex justify-between items-center pb-3 border-b border-brand-lightGray dark:border-[#3a3a3a]">
                    <span className="text-brand-sage dark:text-gray-400 text-sm font-medium">Realized Gains</span>
                    <span className="text-brand-medium dark:text-brand-mint font-bold">+ ${summary.netGains.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-brand-sage dark:text-gray-400 text-sm font-medium">Rent Payouts</span>
                    <span className="text-brand-medium dark:text-brand-mint font-bold">+ ${summary.totalRentEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                 </div>
              </div>
              <button className="w-full mt-6 bg-brand-deep hover:bg-brand-dark text-white py-3 rounded-lg font-bold text-sm transition-colors">
                 View Statements
              </button>
           </div>
        </div>
      </div>

      <div>
         <h2 className="text-2xl font-bold text-brand-dark dark:text-white mb-4">Assets</h2>
         
         <div className="flex gap-8 border-b border-brand-lightGray dark:border-[#3a3a3a] mb-2">
            <button 
                onClick={() => setAssetTab('properties')}
                className={`pb-3 text-sm font-bold transition-colors relative ${
                    assetTab === 'properties' 
                    ? 'text-brand-deep border-b-2 border-brand-deep' 
                    : 'text-brand-sage dark:text-gray-400 hover:text-brand-dark dark:text-white'
                }`}
            >
                Properties
            </button>
            <button 
                onClick={() => setAssetTab('crypto')}
                className={`pb-3 text-sm font-bold transition-colors relative ${
                    assetTab === 'crypto' 
                    ? 'text-brand-deep border-b-2 border-brand-deep' 
                    : 'text-brand-sage dark:text-gray-400 hover:text-brand-dark dark:text-white'
                }`}
            >
                Crypto
            </button>
         </div>

         <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#3a3a3a] rounded-2xl overflow-hidden shadow-sm mt-4">
            
            <div className="divide-y divide-brand-lightGray">
               
               {assetTab === 'properties' ? (
                   properties.length > 0 ? (
                     properties.map((h: any) => (
                        <Link 
                          key={h.id} 
                          to={`/holdings/${h.propertyId || h.id}`}
                          className="p-4 flex items-center justify-between hover:bg-white dark:bg-[#101010]/30 transition-colors cursor-pointer group block"
                        >
                            <div className="flex items-center gap-4">
                               <img src={h.image} alt={h.title} className="w-10 h-10 rounded-full object-cover bg-brand-lightGray dark:bg-[#2a2a2a]" />
                               <div>
                                  <p className="font-bold text-brand-dark dark:text-white text-base group-hover:text-brand-deep transition-colors">{h.title}</p>
                                  <p className="text-xs text-brand-sage dark:text-gray-400 font-medium">{h.location}</p>
                               </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                 <p className="font-bold text-brand-dark dark:text-white text-base">${h.totalValue.toLocaleString()}</p>
                                 <p className={`text-xs font-bold ${h.change >= 0 ? 'text-brand-medium' : 'text-red-500'}`}>
                                    {h.change > 0 ? '+' : ''}{h.change.toFixed(1)}%
                                 </p>
                              </div>
                              <i className="fa-solid fa-chevron-right text-brand-lightGray group-hover:text-brand-sage dark:text-gray-400 transition-colors"></i>
                            </div>
                        </Link>
                     ))
                   ) : (
                     <div className="p-8 text-center">
                       <i className="fa-solid fa-building text-4xl text-brand-lightGray mb-3"></i>
                       <p className="text-brand-sage dark:text-gray-400">No property tokens owned yet.</p>
                       <p className="text-brand-sage dark:text-gray-400 text-sm">Visit the Marketplace to buy property tokens.</p>
                     </div>
                   )
               ) : (
                   Object.entries(walletBalances).map(([key, crypto]: [string, any]) => (
                      <div key={key} className="p-4 flex items-center justify-between hover:bg-white dark:bg-[#101010]/30 transition-colors cursor-pointer">
                         <div className="flex items-center gap-4">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: `${CRYPTO_ICONS[key]?.color || '#ccc'}15` }}
                            >
                               <img 
                                 src={CRYPTO_ICONS[key]?.icon} 
                                 alt={crypto.name} 
                                 className="w-6 h-6 object-contain"
                                 onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                               />
                            </div>
                            <div>
                               <p className="font-bold text-brand-dark dark:text-white text-base">{crypto.name}</p>
                               <p className="text-xs text-brand-sage dark:text-gray-400 font-medium">{crypto.symbol}</p>
                            </div>
                         </div>
                         
                         <div className="text-right">
                            <p className="font-bold text-brand-dark dark:text-white text-base">${crypto.balance.toLocaleString()}</p>
                            <p className="text-xs text-brand-sage dark:text-gray-400 font-medium">{crypto.balance.toLocaleString()} {crypto.symbol}</p>
                         </div>
                      </div>
                   ))
               )}

            </div>
         </div>
      </div>

      {recentActivity.length > 0 && (
        <div>
           <h2 className="text-xl font-bold text-brand-dark dark:text-white mb-4">Recent Activity</h2>
           <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#3a3a3a] rounded-2xl overflow-hidden shadow-sm">
               {recentActivity.map((tx: any) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between border-b border-brand-lightGray dark:border-[#3a3a3a] last:border-0 hover:bg-white dark:bg-[#101010]/30 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.positive ? 'bg-brand-mint dark:bg-[#2a2a2a] text-brand-deep' : 'bg-brand-lightGray dark:bg-[#2a2a2a] text-brand-dark dark:text-white'
                        }`}>
                            <i className={`fa-solid ${
                              tx.type === 'RENT_DISTRIBUTION' ? 'fa-hand-holding-dollar' : 
                              tx.type === 'BUY' ? 'fa-arrow-trend-up' : 
                              tx.type === 'BORROW' ? 'fa-coins' :
                              'fa-wallet'
                            }`}></i>
                        </div>
                        <div>
                           <p className="font-bold text-brand-dark dark:text-white text-sm">
                             {tx.type === 'RENT_DISTRIBUTION' ? 'Rent Payout' : 
                              tx.type === 'BUY' ? 'Buy' :
                              tx.type === 'BORROW' ? 'Borrow' :
                              tx.type === 'DEPOSIT' ? 'Deposit' : tx.type}
                           </p>
                           <p className="text-xs text-brand-sage dark:text-gray-400">
                             {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {tx.asset}
                           </p>
                        </div>
                     </div>
                     <div className={`font-bold text-sm ${tx.positive ? 'text-brand-medium' : 'text-brand-dark dark:text-white'}`}>
                        {tx.amount}
                     </div>
                  </div>
               ))}
           </div>
        </div>
      )}
    </div>
  );
};
