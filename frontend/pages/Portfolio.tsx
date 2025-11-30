import React, { useState } from 'react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { MOCK_PROPERTIES } from '../api/mockData';

// Mock Holdings Data
const PORTFOLIO_HOLDINGS = [
  {
    propertyId: '1',
    tokensOwned: 50,
    avgCost: 50.00,
    currentPrice: 52.50,
    totalValue: 2625.00,
    change: 5.0
  },
  {
    propertyId: '2',
    tokensOwned: 10,
    avgCost: 50.00,
    currentPrice: 51.20,
    totalValue: 512.00,
    change: 2.4
  }
];

// Mock Chart Data
const DATA = [
  { name: 'Jan', v: 24000 }, { name: 'Feb', v: 24500 }, { name: 'Mar', v: 24200 }, 
  { name: 'Apr', v: 25800 }, { name: 'May', v: 26100 }, { name: 'Jun', v: 26354 }
];

const TRANSACTIONS = [
  { id: 1, type: 'Rent Payout', date: 'Oct 01', amount: '+ $45.20', asset: '560 State St' },
  { id: 2, type: 'Buy', date: 'Sep 28', amount: '- $500.00', asset: '88 Oakely Lane' },
  { id: 3, type: 'Deposit', date: 'Sep 24', amount: '+ $1,000.00', asset: 'USDC' },
];

export const Portfolio: React.FC = () => {
  const [timeframe, setTimeframe] = useState('1M');
  const [assetTab, setAssetTab] = useState<'properties' | 'crypto'>('properties');

  // Helper to merge holding data with property details
  const holdings = PORTFOLIO_HOLDINGS.map(h => {
    const prop = MOCK_PROPERTIES.find(p => p.id === h.propertyId);
    return { ...h, ...prop };
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-24">
      
      {/* Hero Section (Balance + Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Chart & Balance */}
        <div className="lg:col-span-2 space-y-6">
           <div>
              <p className="text-brand-sage font-bold text-sm uppercase tracking-wide mb-1">Total Balance</p>
              <h1 className="text-4xl md:text-5xl font-bold text-brand-dark mb-2">$26,354.00</h1>
              <div className="flex items-center gap-2 text-sm font-bold">
                 <span className="text-brand-medium">+ $1,254.00 (4.98%)</span>
                 <span className="text-brand-sage px-2 bg-brand-offWhite rounded-full">Past Month</span>
              </div>
           </div>

           {/* Chart */}
           <div className="h-64 md:h-80 w-full -ml-2">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={DATA}>
                  <defs>
                    <linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#41b39a" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#41b39a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                     itemStyle={{ color: '#173726', fontWeight: 'bold' }}
                     formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                  />
                  <Area type="monotone" dataKey="v" stroke="#41b39a" strokeWidth={3} fill="url(#colorV)" />
                </AreaChart>
             </ResponsiveContainer>
           </div>

           {/* Timeframe Selectors */}
           <div className="flex gap-2 border-b border-brand-lightGray pb-4">
              {['1H', '1D', '1W', '1M', '1Y', 'All'].map(tf => (
                 <button 
                   key={tf}
                   onClick={() => setTimeframe(tf)}
                   className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      timeframe === tf 
                      ? 'bg-brand-lightGray text-brand-deep' 
                      : 'text-brand-sage hover:text-brand-dark hover:bg-white'
                   }`}
                 >
                   {tf}
                 </button>
              ))}
           </div>
        </div>

        {/* Right Col: Quick Stats / Actions (Desktop) */}
        <div className="hidden lg:block space-y-6">
           <div className="bg-white border border-brand-lightGray rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-brand-dark mb-4">Your Performance</h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center pb-3 border-b border-brand-lightGray">
                    <span className="text-brand-sage text-sm font-medium">Net Invested</span>
                    <span className="text-brand-dark font-bold">$25,100.00</span>
                 </div>
                 <div className="flex justify-between items-center pb-3 border-b border-brand-lightGray">
                    <span className="text-brand-sage text-sm font-medium">Realized Gains</span>
                    <span className="text-brand-medium font-bold">+ $450.00</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-brand-sage text-sm font-medium">Rent Payouts</span>
                    <span className="text-brand-medium font-bold">+ $124.50</span>
                 </div>
              </div>
              <button className="w-full mt-6 bg-brand-deep hover:bg-brand-dark text-white py-3 rounded-lg font-bold text-sm transition-colors">
                 View Statements
              </button>
           </div>
        </div>
      </div>

      {/* Assets Section */}
      <div>
         <h2 className="text-2xl font-bold text-brand-dark mb-4">Assets</h2>
         
         {/* Tabs */}
         <div className="flex gap-8 border-b border-brand-lightGray mb-2">
            <button 
                onClick={() => setAssetTab('properties')}
                className={`pb-3 text-sm font-bold transition-colors relative ${
                    assetTab === 'properties' 
                    ? 'text-brand-deep border-b-2 border-brand-deep' 
                    : 'text-brand-sage hover:text-brand-dark'
                }`}
            >
                Properties
            </button>
            <button 
                onClick={() => setAssetTab('crypto')}
                className={`pb-3 text-sm font-bold transition-colors relative ${
                    assetTab === 'crypto' 
                    ? 'text-brand-deep border-b-2 border-brand-deep' 
                    : 'text-brand-sage hover:text-brand-dark'
                }`}
            >
                Crypto
            </button>
         </div>

         {/* Asset List */}
         <div className="bg-white border border-brand-lightGray rounded-2xl overflow-hidden shadow-sm mt-4">
            
            <div className="divide-y divide-brand-lightGray">
               
               {assetTab === 'properties' ? (
                   // PROPERTIES LIST
                   holdings.map((h, i) => (
                      <div key={i} className="p-4 flex items-center justify-between hover:bg-brand-offWhite/30 transition-colors cursor-pointer group">
                          <div className="flex items-center gap-4">
                             <img src={h.image} alt={h.title} className="w-10 h-10 rounded-full object-cover bg-brand-lightGray" />
                             <div>
                                <p className="font-bold text-brand-dark text-base">{h.title}</p>
                                <p className="text-xs text-brand-sage font-medium">{h.location}</p>
                             </div>
                          </div>

                          <div className="text-right">
                             <p className="font-bold text-brand-dark text-base">${h.totalValue.toLocaleString()}</p>
                             <p className={`text-xs font-bold ${h.change >= 0 ? 'text-brand-medium' : 'text-red-500'}`}>
                                {h.change > 0 ? '+' : ''}{h.change}%
                             </p>
                          </div>
                      </div>
                   ))
               ) : (
                   // CRYPTO LIST
                   <div className="p-4 flex items-center justify-between hover:bg-brand-offWhite/30 transition-colors cursor-pointer">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <i className="fa-solid fa-dollar-sign text-lg"></i>
                         </div>
                         <div>
                            <p className="font-bold text-brand-dark text-base">US Dollar Coin</p>
                            <p className="text-xs text-brand-sage font-medium">USDC</p>
                         </div>
                      </div>
                      
                      <div className="text-right">
                         <p className="font-bold text-brand-dark text-base">$3,217.00</p>
                         <p className="text-xs text-brand-sage font-medium">3,217.00 USDC</p>
                      </div>
                   </div>
               )}

            </div>
         </div>
      </div>

      {/* Recent Activity */}
      <div>
         <h2 className="text-xl font-bold text-brand-dark mb-4">Recent Activity</h2>
         <div className="bg-white border border-brand-lightGray rounded-2xl overflow-hidden shadow-sm">
             {TRANSACTIONS.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between border-b border-brand-lightGray last:border-0 hover:bg-brand-offWhite/30 transition-colors">
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.type === 'Rent Payout' ? 'bg-brand-mint text-brand-deep' : 'bg-brand-lightGray text-brand-dark'
                      }`}>
                          <i className={`fa-solid ${tx.type === 'Rent Payout' ? 'fa-hand-holding-dollar' : tx.type === 'Buy' ? 'fa-arrow-trend-up' : 'fa-wallet'}`}></i>
                      </div>
                      <div>
                         <p className="font-bold text-brand-dark text-sm">{tx.type}</p>
                         <p className="text-xs text-brand-sage">{tx.date} • {tx.asset}</p>
                      </div>
                   </div>
                   <div className={`font-bold text-sm ${tx.amount.startsWith('+') ? 'text-brand-medium' : 'text-brand-dark'}`}>
                      {tx.amount}
                   </div>
                </div>
             ))}
         </div>
      </div>
    </div>
  );
};