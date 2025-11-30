import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPropertyById } from '../api/mockData';
import { Property } from '../../types';
import { TokenDetailsMobile } from '../mobile/TokenDetailsMobile';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CHART_DATA = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 550 },
  { name: 'Apr', value: 480 },
  { name: 'May', value: 600 },
  { name: 'Jun', value: 750 },
];

export const TokenDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');

  useEffect(() => {
    // Simulate API Fetch
    setTimeout(() => {
        if (id) {
            const data = getPropertyById(id);
            setProperty(data || null);
        }
        setLoading(false);
    }, 600);
  }, [id]);

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-deep"></div>
          </div>
      );
  }

  if (!property) {
      return <div className="p-8 text-center">Property not found</div>;
  }

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
          <TokenDetailsMobile property={property} />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block max-w-6xl mx-auto p-8">
        
        <button onClick={() => navigate('/marketplace')} className="text-brand-sage hover:text-brand-dark mb-6 flex items-center gap-2 font-medium">
             <i className="fa-solid fa-arrow-left"></i> Back to Marketplace
        </button>

        <div className="grid grid-cols-3 gap-8">
            {/* Left Column: Content */}
            <div className="col-span-2 space-y-8">
                
                {/* Hero */}
                <div className="flex gap-6">
                    <img src={property.image} alt={property.title} className="w-32 h-32 object-cover rounded-xl bg-brand-lightGray shadow-sm" />
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <span className="bg-brand-mint text-brand-deep px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">{property.type}</span>
                             <span className="text-brand-sage text-sm"><i className="fa-solid fa-location-dot"></i> {property.location}</span>
                        </div>
                        <h1 className="text-3xl font-bold text-brand-dark mb-1">{property.title}</h1>
                        <div className="text-2xl font-bold text-brand-dark">
                            ${property.totalValue.toLocaleString()} <span className="text-brand-medium text-lg ml-2 font-semibold">+2.1%</span>
                        </div>
                    </div>
                </div>

                {/* Tabs & Info */}
                <div>
                    <div className="flex border-b border-brand-lightGray mb-6">
                        {['Overview', 'Insights', 'Financials'].map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 font-semibold text-sm transition-colors ${
                                    activeTab === tab 
                                    ? 'border-b-2 border-brand-deep text-brand-deep' 
                                    : 'text-brand-sage hover:text-brand-dark'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    
                    <div className="min-h-[200px]">
                        {activeTab === 'Overview' && (
                            <div className="space-y-6">
                                {/* Chart Section (Moved Inside Overview) */}
                                <div className="bg-white border border-brand-lightGray rounded-xl p-6 h-80">
                                   <h3 className="font-bold text-brand-dark mb-4">Price History</h3>
                                   <ResponsiveContainer width="100%" height="100%">
                                      <AreaChart data={CHART_DATA}>
                                        <defs>
                                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#41b39a" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#41b39a" stopOpacity={0}/>
                                          </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#7ebea6', fontSize: 12}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#7ebea6', fontSize: 12}} />
                                        <Tooltip 
                                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                        />
                                        <Area type="monotone" dataKey="value" stroke="#41b39a" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                      </AreaChart>
                                   </ResponsiveContainer>
                                </div>

                                {/* Financial Summary Card (Desktop Version) */}
                                <div className="bg-brand-mint/20 border border-brand-mint rounded-xl p-6">
                                   <div className="grid grid-cols-3 gap-6">
                                       <div className="border-r border-brand-mint/50 pr-4">
                                           <div className="flex items-center gap-1 mb-1">
                                               <span className="text-sm font-bold text-brand-dark">Starting Price</span>
                                               <i className="fa-regular fa-circle-info text-brand-sage text-xs"></i>
                                           </div>
                                           <p className="text-2xl font-bold text-brand-deep">${property.tokenPrice.toFixed(2)}</p>
                                       </div>
                                       <div className="border-r border-brand-mint/50 px-4">
                                           <div className="flex items-center gap-1 mb-1">
                                               <span className="text-sm font-bold text-brand-dark">Projected Annual Return</span>
                                               <i className="fa-regular fa-circle-info text-brand-sage text-xs"></i>
                                           </div>
                                           <p className="text-2xl font-bold text-brand-medium">{(property.rentalYield + 2.5).toFixed(2)}%</p>
                                       </div>
                                       <div className="pl-4">
                                           <div className="flex items-center gap-1 mb-1">
                                               <span className="text-sm font-bold text-brand-dark">Rental Yield</span>
                                               <i className="fa-regular fa-circle-info text-brand-sage text-xs"></i>
                                           </div>
                                           <p className="text-2xl font-bold text-brand-medium">{property.rentalYield}%</p>
                                       </div>
                                   </div>
                                </div>

                                <div className="prose text-brand-dark max-w-none">
                                    <p>
                                        This premium {property.type.toLowerCase()} asset in {property.location} offers a unique opportunity for fractional ownership.
                                        With a projected rental yield of {property.rentalYield}%, investors can expect steady cash flow distributed directly to their USDC balance.
                                    </p>
                                    <h4 className="font-bold mt-4 mb-2 text-lg">Why Invest?</h4>
                                    <ul className="list-disc pl-5 space-y-2 text-brand-sage">
                                        <li>Located in high-growth metropolitan area with strong demand.</li>
                                        <li>Fully managed property maintenance by top-tier partners.</li>
                                        <li>Quarterly valuation updates ensured by independent appraisers.</li>
                                        <li>Instant liquidity via the Parco marketplace (Phase 2).</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Insights' && (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="font-bold text-brand-dark text-lg mb-4">Property Details</h3>
                                    <ul className="list-disc pl-5 space-y-3 text-brand-dark leading-relaxed">
                                        <li>
                                            <span className="font-bold text-brand-sage">Historic Significance:</span> Situated in The Pastures Historic District, noted for remarkable architectural heritage.
                                        </li>
                                        <li>
                                            <span className="font-bold text-brand-sage">Prime Location:</span> Near Medical Center, Union Center, and Empire State Plaza with easy access to highways.
                                        </li>
                                        <li>
                                            <span className="font-bold text-brand-sage">Recent Upgrades:</span> New furniture and appliances have just been installed in the units.
                                        </li>
                                        <li>
                                            <span className="font-bold text-brand-sage">Growth Potential:</span> New York Plans to Invest $1 Billion to Expand Chip Research in Albany.
                                        </li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="font-bold text-brand-dark text-lg mb-4">Documents</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { title: "Appraisal", date: "Oct 2023", size: "2.4 MB" },
                                            { title: "Operating Agreement", date: "Sep 2023", size: "1.1 MB" },
                                            { title: "Rent Roll", date: "Current", size: "850 KB" },
                                            { title: "Inspection Report", date: "Aug 2023", size: "3.2 MB" },
                                        ].map((doc, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 border border-brand-lightGray rounded-xl hover:bg-brand-offWhite cursor-pointer transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-brand-lightGray flex items-center justify-center text-brand-deep group-hover:bg-brand-mint">
                                                        <i className="fa-regular fa-file-lines text-lg"></i>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-brand-dark text-sm">{doc.title}</p>
                                                        <p className="text-xs text-brand-sage">{doc.date} • {doc.size}</p>
                                                    </div>
                                                </div>
                                                <i className="fa-solid fa-download text-brand-sage group-hover:text-brand-deep"></i>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Financials' && (
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                 {/* Left: Operating & Returns */}
                                 <div className="space-y-8">
                                     <div className="bg-brand-offWhite p-6 rounded-xl border border-brand-lightGray">
                                        <h3 className="font-bold text-brand-dark mb-4 border-b border-brand-lightGray pb-2">Projected Returns</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-brand-dark font-medium text-sm">Annual Return</span>
                                                <span className="text-brand-deep font-bold">12.25%</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-brand-sage font-medium text-sm">Rental Yield</span>
                                                <span className="text-brand-dark font-medium">10.79%</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-brand-sage font-medium text-sm">Appreciation</span>
                                                <span className="text-brand-dark font-medium">1.70%</span>
                                            </div>
                                        </div>
                                     </div>

                                     <div>
                                        <h3 className="font-bold text-brand-dark mb-4 border-b border-brand-lightGray pb-2">Operating Financials</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-brand-dark font-bold text-sm">Annual Gross Rents</span>
                                                <span className="text-brand-medium font-bold">$119,455</span>
                                            </div>
                                            {[
                                                { label: "Property Taxes", value: "-$5,729.28" },
                                                { label: "Homeowners Insurance", value: "-$3,378.00" },
                                                { label: "Property Management", value: "-$29,863.92" },
                                                { label: "Utilities", value: "-$49,670.64" },
                                                { label: "LLC Admin & Filing Fees", value: "-$750.00" },
                                            ].map((item, i) => (
                                                <div key={i} className="flex justify-between items-center text-sm">
                                                    <span className="text-brand-sage font-medium">{item.label}</span>
                                                    <span className="text-brand-dark font-medium">{item.value}</span>
                                                </div>
                                            ))}
                                            <div className="border-t border-brand-lightGray pt-2 flex justify-between items-center mt-2">
                                                <span className="text-brand-dark font-bold text-sm">Annual Cash Flow</span>
                                                <span className="text-brand-medium font-bold">$30,064</span>
                                            </div>
                                        </div>
                                     </div>
                                 </div>

                                 {/* Right: Acquisition */}
                                 <div>
                                     <h3 className="font-bold text-brand-dark mb-4 border-b border-brand-lightGray pb-2">Acquisition Breakdown</h3>
                                     <div className="bg-white border border-brand-lightGray rounded-xl p-6 space-y-4">
                                         {[
                                             { label: "Underlying Asset Price", value: "$350,000" },
                                             { label: "Closing Costs", value: "$22,200" },
                                             { label: "Upfront DAO Fees", value: "$550" },
                                             { label: "Operating Reserve (0%)", value: "$1,147" },
                                         ].map((item, i) => (
                                             <div key={i} className="flex justify-between items-center text-sm">
                                                 <span className="text-brand-sage font-medium">{item.label}</span>
                                                 <span className="text-brand-dark font-medium">{item.value}</span>
                                             </div>
                                         ))}
                                         <div className="border-t border-brand-lightGray pt-4 flex justify-between items-center">
                                             <span className="text-brand-dark font-bold">Total Investment Value</span>
                                             <span className="text-brand-deep font-bold text-lg">$373,897</span>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Buy Panel */}
            <div className="col-span-1">
                <div className="bg-white border border-brand-lightGray rounded-xl p-6 shadow-sm sticky top-6">
                    <h3 className="font-bold text-xl text-brand-dark mb-4">Invest</h3>
                    
                    <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-brand-sage">Token Price</span>
                            <span className="font-bold text-brand-dark">${property.tokenPrice}</span>
                        </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-brand-sage">Available</span>
                            <span className="font-bold text-brand-dark">{property.tokensAvailable} Tokens</span>
                        </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-brand-sage">Projected APY</span>
                            <span className="font-bold text-brand-medium">{property.rentalYield}%</span>
                        </div>
                    </div>

                    <div className="bg-brand-offWhite p-4 rounded-lg mb-6">
                        <div className="flex justify-between mb-2">
                            <span className="text-xs font-bold text-brand-sage">AMOUNT</span>
                            <span className="text-xs font-bold text-brand-deep cursor-pointer">MAX</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                placeholder="0" 
                                className="bg-transparent text-2xl font-bold text-brand-dark w-full outline-none" 
                            />
                            <span className="text-brand-sage font-medium">TOKENS</span>
                        </div>
                        <div className="text-right text-xs text-brand-sage mt-1">≈ $0.00 USDC</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                         <button 
                            className={`w-full py-3 rounded-lg font-bold text-white shadow-sm transition-all text-sm ${
                                 property.tokensAvailable === 0 ? 'bg-brand-sage cursor-not-allowed' : 'bg-brand-deep hover:bg-brand-dark'
                            }`}
                            disabled={property.tokensAvailable === 0}
                        >
                             Buy
                        </button>
                        <button 
                             className="w-full py-3 rounded-lg font-bold text-brand-deep border border-brand-deep hover:bg-brand-offWhite transition-all text-sm"
                        >
                             Sell
                        </button>
                    </div>
                    
                    <p className="text-xs text-center text-brand-sage mt-4">
                        By purchasing, you agree to the <span className="underline cursor-pointer">Terms of Service</span>.
                    </p>
                </div>
            </div>
        </div>
      </div>
    </>
  );
};