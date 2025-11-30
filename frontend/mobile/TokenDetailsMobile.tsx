import React, { useState } from 'react';
import { Property } from '../../types';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface TokenDetailsMobileProps {
  property: Property;
}

// Mock Chart Data
const DATA = [
  { v: 400 }, { v: 420 }, { v: 410 }, { v: 450 }, { v: 440 }, { v: 480 }, { v: 500 }, { v: 490 }, { v: 550 }, { v: 580 }
];

export const TokenDetailsMobile: React.FC<TokenDetailsMobileProps> = ({ property }) => {
  const [timeframe, setTimeframe] = useState('1M');
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24 fixed inset-0 z-[100] overflow-y-auto no-scrollbar">
      {/* Top Nav */}
      <div className="px-4 py-4 flex items-center bg-white sticky top-0 z-20">
        <button 
             onClick={() => window.history.back()}
             className="text-brand-dark text-xl p-2 -ml-2"
        >
             <i className="fa-solid fa-arrow-left"></i>
        </button>
        <span className="ml-2 font-bold text-brand-dark">{property.title}</span>
      </div>

      {/* Header Section (Price & Image) */}
      <div className="px-6 flex justify-between items-start mb-4 mt-2">
        <div>
           <div className="flex items-baseline gap-2">
             <span className="text-3xl font-bold text-brand-dark">${property.tokenPrice.toFixed(2)}</span>
             <span className="text-brand-medium font-bold text-sm">+2.1%</span>
           </div>
           <p className="text-brand-sage text-xs font-bold uppercase tracking-wide mt-1">Current Token Price</p>
        </div>
        {/* Thumbnail Image (Right Side) */}
        <img 
          src={property.image} 
          alt={property.title} 
          className="w-14 h-14 rounded-lg object-cover bg-brand-lightGray shadow-sm"
        />
      </div>

      {/* Tabs */}
      <div className="px-6 mb-4">
         <div className="flex gap-8 border-b border-brand-lightGray relative">
            {['Overview', 'Insights', 'Financials'].map(tab => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={`pb-3 text-sm font-bold transition-colors relative z-10 ${
                    activeTab === tab 
                    ? 'text-brand-deep border-b-2 border-brand-deep -mb-[2px]' 
                    : 'text-brand-sage'
                 }`}
               >
                 {tab}
               </button>
            ))}
         </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
         {activeTab === 'Overview' && (
             <div className="space-y-0">
                {/* Chart - Now Inside Overview */}
                <div className="h-48 w-full mb-4 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={DATA}>
                      <defs>
                        <linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9eefbc" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#9eefbc" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area 
                          type="monotone" 
                          dataKey="v" 
                          stroke="#1fae6e" 
                          strokeWidth={2} 
                          fill="url(#colorV)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Timeframe Selectors - Now Inside Overview */}
                <div className="flex justify-between px-6 mb-6 border-b border-brand-lightGray pb-4">
                  {['1D', '1W', '1M', '1Y', 'All'].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                        timeframe === tf 
                          ? 'bg-brand-lightGray text-brand-deep' 
                          : 'text-brand-sage bg-transparent'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                {/* Metric Rows - Inline Style matching Screenshot 2 */}
                <div className="px-6">
                  <div className="flex justify-between items-center py-3 border-b border-brand-lightGray/50">
                      <span className="text-brand-dark font-bold text-sm">Projected Annual Return</span>
                      <span className="text-brand-medium font-bold text-sm">12.30%</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-brand-lightGray/50">
                      <span className="text-brand-dark font-bold text-sm">Rental Yield</span>
                      <span className="text-brand-medium font-bold text-sm">9.8%</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-brand-lightGray/50">
                      <span className="text-brand-dark font-bold text-sm">Total Value</span>
                      <span className="text-brand-dark font-bold text-sm">$9,500</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-brand-lightGray/50">
                      <span className="text-brand-dark font-bold text-sm">Total Supply</span>
                      <span className="text-brand-sage font-medium text-sm">1,000 Tokens</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-brand-lightGray/50">
                      <span className="text-brand-dark font-bold text-sm">Market Cap</span>
                      <span className="text-brand-medium font-medium text-sm">$9,500</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-brand-lightGray/50">
                      <span className="text-brand-dark font-bold text-sm">Asset Type</span>
                      <span className="text-brand-sage font-medium text-sm text-right uppercase">RESIDENTIAL</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-brand-lightGray/50">
                      <span className="text-brand-dark font-bold text-sm">Location</span>
                      <span className="text-brand-sage font-medium text-sm text-right">New York, NY</span>
                  </div>

                  <div className="pt-6">
                     <h4 className="font-bold text-brand-dark text-sm mb-2">About this Property</h4>
                     <p className="text-sm text-brand-sage leading-relaxed">
                       This property is a historically significant building situated in a prime residential area. 
                       It offers high yield potential through fractional ownership and is fully managed by professional property managers.
                     </p>
                  </div>
                </div>
             </div>
         )}

         {activeTab === 'Insights' && (
             <div className="px-6 space-y-8">
                 {/* Property Details Bullets */}
                 <div>
                    <h3 className="font-bold text-brand-dark text-base border-b border-brand-lightGray pb-2 mb-3">Property Details</h3>
                    <ul className="list-disc pl-5 space-y-3 text-sm text-brand-dark leading-relaxed">
                        <li>
                            <span className="text-brand-sage">Historic Significance:</span> Situated in The Pastures Historic District, noted for remarkable architectural heritage.
                        </li>
                        <li>
                            <span className="text-brand-sage">Prime Location:</span> Near Medical Center, Union Center, and Empire State Plaza with easy access to highways.
                        </li>
                        <li>
                            <span className="text-brand-sage">Recent Upgrades:</span> New furniture and appliances have just been installed in the units.
                        </li>
                        <li>
                            <span className="text-brand-sage">Growth Potential:</span> New York Plans to Invest $1 Billion to Expand Chip Research in Albany.
                        </li>
                    </ul>
                 </div>

                 {/* Documents List */}
                 <div>
                    <h3 className="font-bold text-brand-dark text-base border-b border-brand-lightGray pb-2 mb-3">Documents</h3>
                    <div className="space-y-2">
                        {[
                            { title: "Appraisal", date: "Oct 2023", size: "2.4 MB" },
                            { title: "Operating Agreement", date: "Sep 2023", size: "1.1 MB" },
                            { title: "Rent Roll", date: "Current", size: "850 KB" },
                            { title: "Inspection Report", date: "Aug 2023", size: "3.2 MB" },
                        ].map((doc, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-brand-lightGray rounded-xl shadow-sm active:scale-[0.99] transition-transform">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-brand-offWhite flex items-center justify-center text-brand-deep">
                                        <i className="fa-regular fa-file-lines"></i>
                                    </div>
                                    <div>
                                        <p className="font-bold text-brand-dark text-sm">{doc.title}</p>
                                        <p className="text-xs text-brand-sage">{doc.date} • {doc.size}</p>
                                    </div>
                                </div>
                                <i className="fa-solid fa-chevron-right text-brand-sage text-xs"></i>
                            </div>
                        ))}
                    </div>
                 </div>
             </div>
         )}

         {activeTab === 'Financials' && (
             <div className="px-6 pb-8 space-y-8">
                 
                 {/* Returns Summary Section */}
                 <div className="bg-brand-offWhite rounded-xl p-4 border border-brand-lightGray">
                    <h4 className="font-bold text-brand-dark mb-3 text-sm">Projected Returns</h4>
                    <div className="space-y-3">
                       <div className="flex justify-between items-center">
                          <span className="text-brand-dark font-bold text-sm">Projected Annual Return</span>
                          <span className="text-brand-medium font-bold text-sm">12.25%</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-brand-sage font-medium text-sm">Projected Rental Yield</span>
                          <span className="text-brand-dark font-medium text-sm">10.79%</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-brand-sage font-medium text-sm">Projected Appreciation</span>
                          <span className="text-brand-dark font-medium text-sm">1.70%</span>
                       </div>
                    </div>
                 </div>

                 {/* Operating Expenses Section (Screenshot 1) */}
                 <div>
                    <h3 className="font-bold text-brand-dark text-base border-b border-brand-lightGray pb-2 mb-3">Operating Financials (Annual)</h3>
                    <div className="space-y-3">
                       <div className="flex justify-between items-center">
                          <span className="text-brand-dark font-bold text-sm">Annual Gross Rents</span>
                          <span className="text-brand-medium font-bold text-sm">$119,455</span>
                       </div>
                       
                       {[
                         { label: "Property Taxes", value: "-$5,729.28" },
                         { label: "Homeowners Insurance", value: "-$3,378.00" },
                         { label: "Property Management", value: "-$29,863.92" },
                         { label: "Utilities", value: "-$49,670.64" },
                         { label: "LLC Admin & Filing Fees", value: "-$750.00" },
                       ].map((item, i) => (
                         <div key={i} className="flex justify-between items-center">
                            <span className="text-brand-sage font-medium text-sm">{item.label}</span>
                            <span className="text-brand-dark font-medium text-sm">{item.value}</span>
                         </div>
                       ))}

                       <div className="border-t border-brand-lightGray my-2 pt-2 flex justify-between items-center">
                          <span className="text-brand-dark font-bold text-sm">Annual Cash Flow</span>
                          <span className="text-brand-medium font-bold text-sm">$30,064</span>
                       </div>
                        <div className="flex justify-between items-center">
                          <span className="text-brand-sage font-medium text-sm">Cap Rate</span>
                          <span className="text-brand-dark font-medium text-sm">5.36%</span>
                       </div>
                    </div>
                 </div>

                 {/* Acquisition Breakdown Section (Screenshot 3) */}
                 <div>
                    <h3 className="font-bold text-brand-dark text-base border-b border-brand-lightGray pb-2 mb-3">Acquisition Breakdown</h3>
                    <div className="space-y-3">
                       {[
                         { label: "Underlying Asset Price", value: "$350,000" },
                         { label: "Closing Costs (Insp. & Appr.)", value: "$22,200" },
                         { label: "Upfront DAO Fees", value: "$550" },
                         { label: "Operating Reserve (0%)", value: "$1,147" },
                       ].map((item, i) => (
                         <div key={i} className="flex justify-between items-center">
                            <span className="text-brand-sage font-medium text-sm">{item.label}</span>
                            <span className="text-brand-dark font-medium text-sm">{item.value}</span>
                         </div>
                       ))}
                       
                       <div className="border-t border-brand-lightGray my-2 pt-2 flex justify-between items-center">
                          <span className="text-brand-dark font-bold text-sm">Total Investment Value</span>
                          <span className="text-brand-deep font-bold text-sm">$373,897</span>
                       </div>
                    </div>
                 </div>

             </div>
         )}
      </div>

      {/* Bottom Action Buttons (Split Buy/Sell) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 pb-8 z-20 flex gap-4 border-t border-brand-lightGray shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <button className="flex-1 bg-brand-deep text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-brand-dark active:scale-[0.98] transition-all text-sm">
             Buy
          </button>
          <button className="flex-1 bg-white border border-brand-lightGray text-brand-deep font-bold py-3.5 rounded-xl hover:bg-brand-offWhite active:scale-[0.98] transition-all text-sm">
             Sell
          </button>
      </div>
    </div>
  );
};