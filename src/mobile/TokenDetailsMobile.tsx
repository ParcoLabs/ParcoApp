import React, { useState } from 'react';
import { Property } from '../types';
import { ChainIndicator } from '../components/ChainIndicator';
import { PaymentMethodModal } from '../components/PaymentMethodModal';
import { useBuyFlow, PaymentMethod } from '../hooks/useBuyFlow';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface TokenDetailsMobileProps {
  property: Property;
  buyState?: string;
  isModalOpen?: boolean;
  paymentMethods?: PaymentMethod[];
  vaultBalance?: number;
  selectedMethod?: PaymentMethod | null;
  onBuy?: (propertyId: string, tokenAmount?: number, tokenPrice?: number) => void;
  onCloseModal?: () => void;
  onSelectMethod?: (method: PaymentMethod) => void;
}

// Mock Chart Data
const DATA = [
  { v: 400 }, { v: 420 }, { v: 410 }, { v: 450 }, { v: 440 }, { v: 480 }, { v: 500 }, { v: 490 }, { v: 550 }, { v: 580 }
];

export const TokenDetailsMobile: React.FC<TokenDetailsMobileProps> = ({ 
  property,
  buyState,
  isModalOpen,
  paymentMethods,
  vaultBalance,
  selectedMethod,
  onBuy,
  onCloseModal,
  onSelectMethod,
}) => {
  const [timeframe, setTimeframe] = useState('1M');
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedTokens, setSelectedTokens] = useState(1);
  const [inputMode, setInputMode] = useState<'tokens' | 'dollars'>('tokens');

  const localBuyFlow = useBuyFlow();
  
  const effectiveBuyState = buyState || localBuyFlow.state;
  const effectiveIsModalOpen = isModalOpen !== undefined ? isModalOpen : localBuyFlow.isModalOpen;
  const effectivePaymentMethods = paymentMethods || localBuyFlow.paymentMethods;
  const effectiveVaultBalance = vaultBalance !== undefined ? vaultBalance : localBuyFlow.vaultBalance;
  const effectiveSelectedMethod = selectedMethod !== undefined ? selectedMethod : localBuyFlow.selectedMethod;
  const effectiveOnBuy = onBuy || localBuyFlow.handleBuy;
  const effectiveOnCloseModal = onCloseModal || localBuyFlow.closeModal;
  const effectiveOnSelectMethod = onSelectMethod || localBuyFlow.selectPaymentMethod;

  const handleTokenChange = (delta: number) => {
    setSelectedTokens(prev => Math.max(1, prev + delta));
  };

  const handleDollarChange = (delta: number) => {
    setSelectedTokens(prev => Math.max(1, prev + delta));
  };

  const selectedDollars = selectedTokens * property.tokenPrice;

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#101010] pb-24 fixed inset-0 z-[100] overflow-y-auto no-scrollbar">
      {/* Top Nav */}
      <div className="px-4 py-4 flex items-center bg-white dark:bg-[#101010] sticky top-0 z-20">
        <button 
             onClick={() => window.history.back()}
             className="text-brand-dark dark:text-white text-xl p-2 -ml-2"
        >
             <i className="fa-solid fa-arrow-left"></i>
        </button>
        <span className="ml-2 font-bold text-brand-dark dark:text-white">{property.title}</span>
      </div>

      {/* Header Section (Price & Image) */}
      <div className="px-6 flex justify-between items-start mb-4 mt-2">
        <div>
           <div className="flex items-baseline gap-2">
             <span className="text-3xl font-bold text-brand-dark dark:text-white">${property.tokenPrice.toFixed(2)}</span>
             <span className="text-brand-medium dark:text-brand-mint font-bold text-sm">+2.1%</span>
           </div>
           <p className="text-brand-sage dark:text-gray-400 text-xs font-bold uppercase tracking-wide mt-1">Current Token Price</p>
        </div>
        {/* Thumbnail Image (Right Side) */}
        <img 
          src={property.image} 
          alt={property.title} 
          className="w-14 h-14 rounded-lg object-cover bg-brand-lightGray shadow-sm"
        />
      </div>

      {/* Token/Dollar Amount Selector */}
      <div className="px-6 mb-4">
        <div className="bg-brand-offWhite dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#3a3a3a] rounded-xl p-4">
          {/* Toggle between Tokens and Dollars */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => setInputMode('tokens')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                inputMode === 'tokens'
                  ? 'bg-brand-deep text-white'
                  : 'bg-white dark:bg-[#2a2a2a] text-brand-sage dark:text-gray-400 border border-brand-lightGray dark:border-[#3a3a3a]'
              }`}
            >
              Tokens
            </button>
            <button
              onClick={() => setInputMode('dollars')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                inputMode === 'dollars'
                  ? 'bg-brand-deep text-white'
                  : 'bg-white dark:bg-[#2a2a2a] text-brand-sage dark:text-gray-400 border border-brand-lightGray dark:border-[#3a3a3a]'
              }`}
            >
              Dollars
            </button>
          </div>

          {inputMode === 'tokens' ? (
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleTokenChange(-1)}
                disabled={selectedTokens <= 1}
                className="w-12 h-12 rounded-full bg-white dark:bg-[#2a2a2a] border border-brand-lightGray dark:border-[#3a3a3a] flex items-center justify-center text-brand-deep dark:text-brand-mint text-xl font-bold disabled:opacity-50"
              >
                -
              </button>
              <div className="text-center">
                <p className="text-2xl font-bold text-brand-dark dark:text-white">{selectedTokens} Token{selectedTokens > 1 ? 's' : ''}</p>
                <p className="text-sm text-brand-sage dark:text-gray-400">${selectedDollars.toFixed(2)}</p>
              </div>
              <button
                onClick={() => handleTokenChange(1)}
                className="w-12 h-12 rounded-full bg-white dark:bg-[#2a2a2a] border border-brand-lightGray dark:border-[#3a3a3a] flex items-center justify-center text-brand-deep dark:text-brand-mint text-xl font-bold"
              >
                +
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleDollarChange(-1)}
                  disabled={selectedTokens <= 1}
                  className="w-12 h-12 rounded-full bg-white dark:bg-[#2a2a2a] border border-brand-lightGray dark:border-[#3a3a3a] flex items-center justify-center text-brand-deep dark:text-brand-mint text-xl font-bold disabled:opacity-50"
                >
                  -
                </button>
                <div className="text-center">
                  <p className="text-2xl font-bold text-brand-dark dark:text-white">${selectedDollars.toFixed(2)}</p>
                  <p className="text-sm text-brand-sage dark:text-gray-400">= {selectedTokens} Token{selectedTokens > 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => handleDollarChange(1)}
                  className="w-12 h-12 rounded-full bg-white dark:bg-[#2a2a2a] border border-brand-lightGray dark:border-[#3a3a3a] flex items-center justify-center text-brand-deep dark:text-brand-mint text-xl font-bold"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 mb-4">
         <div className="flex gap-8 border-b border-brand-lightGray dark:border-[#3a3a3a] relative">
            {['Overview', 'Insights', 'Financials'].map(tab => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={`pb-3 text-sm font-bold transition-colors relative z-10 ${
                    activeTab === tab 
                    ? 'text-brand-deep dark:text-brand-mint border-b-2 border-brand-deep dark:border-brand-mint -mb-[2px]' 
                    : 'text-brand-sage dark:text-gray-400'
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
                <div className="flex justify-between px-6 mb-6 border-b border-brand-lightGray dark:border-[#3a3a3a] pb-4">
                  {['1D', '1W', '1M', '1Y', 'All'].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                        timeframe === tf 
                          ? 'bg-brand-lightGray dark:bg-[#2a2a2a] text-brand-deep dark:text-brand-mint' 
                          : 'text-brand-sage dark:text-gray-400 bg-transparent'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                {/* Metric Rows - Inline Style matching Screenshot 2 */}
                <div className="px-6">
                  <div className="flex justify-between items-center py-3 border-b border-brand-lightGray/50 dark:border-[#3a3a3a]">
                      <span className="text-brand-dark dark:text-white font-bold text-sm">Projected Annual Return</span>
                      <span className="text-brand-medium dark:text-brand-mint font-bold text-sm">12.30%</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-brand-lightGray/50 dark:border-[#3a3a3a]">
                      <span className="text-brand-dark dark:text-white font-bold text-sm">Rental Yield</span>
                      <span className="text-brand-medium dark:text-brand-mint font-bold text-sm">9.8%</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-brand-lightGray/50 dark:border-[#3a3a3a]">
                      <span className="text-brand-dark dark:text-white font-bold text-sm">Total Value</span>
                      <span className="text-brand-dark dark:text-white font-bold text-sm">$9,500</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-brand-lightGray/50 dark:border-[#3a3a3a]">
                      <span className="text-brand-dark dark:text-white font-bold text-sm">Total Supply</span>
                      <span className="text-brand-sage dark:text-gray-400 font-medium text-sm">1,000 Tokens</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-brand-lightGray/50 dark:border-[#3a3a3a]">
                      <span className="text-brand-dark dark:text-white font-bold text-sm">Market Cap</span>
                      <span className="text-brand-medium dark:text-brand-mint font-medium text-sm">$9,500</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-brand-lightGray/50 dark:border-[#3a3a3a]">
                      <span className="text-brand-dark dark:text-white font-bold text-sm">Asset Type</span>
                      <span className="text-brand-sage dark:text-gray-400 font-medium text-sm text-right uppercase">{property.type}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-brand-lightGray/50 dark:border-[#3a3a3a]">
                      <span className="text-brand-dark dark:text-white font-bold text-sm">Location</span>
                      <span className="text-brand-sage dark:text-gray-400 font-medium text-sm text-right">{property.location}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-brand-lightGray/50 dark:border-[#3a3a3a]">
                      <span className="text-brand-dark dark:text-white font-bold text-sm">Blockchain</span>
                      <ChainIndicator chain={property.chain} size="sm" />
                  </div>

                  <div className="pt-6">
                     <h4 className="font-bold text-brand-dark dark:text-white text-sm mb-2">About this Property</h4>
                     <p className="text-sm text-brand-sage dark:text-gray-400 leading-relaxed">
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
                    <h3 className="font-bold text-brand-dark dark:text-white text-base border-b border-brand-lightGray dark:border-[#3a3a3a] pb-2 mb-3">Property Details</h3>
                    <ul className="list-disc pl-5 space-y-3 text-sm text-brand-dark dark:text-white leading-relaxed">
                        <li>
                            <span className="text-brand-sage dark:text-gray-400">Historic Significance:</span> Situated in The Pastures Historic District, noted for remarkable architectural heritage.
                        </li>
                        <li>
                            <span className="text-brand-sage dark:text-gray-400">Prime Location:</span> Near Medical Center, Union Center, and Empire State Plaza with easy access to highways.
                        </li>
                        <li>
                            <span className="text-brand-sage dark:text-gray-400">Recent Upgrades:</span> New furniture and appliances have just been installed in the units.
                        </li>
                        <li>
                            <span className="text-brand-sage dark:text-gray-400">Growth Potential:</span> New York Plans to Invest $1 Billion to Expand Chip Research in Albany.
                        </li>
                    </ul>
                 </div>

                 {/* Documents List */}
                 <div>
                    <h3 className="font-bold text-brand-dark dark:text-white text-base border-b border-brand-lightGray dark:border-[#3a3a3a] pb-2 mb-3">Documents</h3>
                    <div className="space-y-2">
                        {[
                            { title: "Appraisal", date: "Oct 2023", size: "2.4 MB" },
                            { title: "Operating Agreement", date: "Sep 2023", size: "1.1 MB" },
                            { title: "Rent Roll", date: "Current", size: "850 KB" },
                            { title: "Inspection Report", date: "Aug 2023", size: "3.2 MB" },
                        ].map((doc, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#3a3a3a] rounded-xl shadow-sm active:scale-[0.99] transition-transform">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-brand-offWhite dark:bg-[#2a2a2a] flex items-center justify-center text-brand-deep dark:text-brand-mint">
                                        <i className="fa-regular fa-file-lines"></i>
                                    </div>
                                    <div>
                                        <p className="font-bold text-brand-dark dark:text-white text-sm">{doc.title}</p>
                                        <p className="text-xs text-brand-sage dark:text-gray-400">{doc.date} • {doc.size}</p>
                                    </div>
                                </div>
                                <i className="fa-solid fa-chevron-right text-brand-sage dark:text-gray-400 text-xs"></i>
                            </div>
                        ))}
                    </div>
                 </div>
             </div>
         )}

         {activeTab === 'Financials' && (
             <div className="px-6 pb-8 space-y-8">
                 
                 {/* Returns Summary Section */}
                 <div className="bg-brand-offWhite dark:bg-[#1a1a1a] rounded-xl p-4 border border-brand-lightGray dark:border-[#3a3a3a]">
                    <h4 className="font-bold text-brand-dark dark:text-white mb-3 text-sm">Projected Returns</h4>
                    <div className="space-y-3">
                       <div className="flex justify-between items-center">
                          <span className="text-brand-dark dark:text-white font-bold text-sm">Projected Annual Return</span>
                          <span className="text-brand-medium dark:text-brand-mint font-bold text-sm">12.25%</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-brand-sage dark:text-gray-400 font-medium text-sm">Projected Rental Yield</span>
                          <span className="text-brand-dark dark:text-white font-medium text-sm">10.79%</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-brand-sage dark:text-gray-400 font-medium text-sm">Projected Appreciation</span>
                          <span className="text-brand-dark dark:text-white font-medium text-sm">1.70%</span>
                       </div>
                    </div>
                 </div>

                 {/* Operating Expenses Section (Screenshot 1) */}
                 <div>
                    <h3 className="font-bold text-brand-dark dark:text-white text-base border-b border-brand-lightGray dark:border-[#3a3a3a] pb-2 mb-3">Operating Financials (Annual)</h3>
                    <div className="space-y-3">
                       <div className="flex justify-between items-center">
                          <span className="text-brand-dark dark:text-white font-bold text-sm">Annual Gross Rents</span>
                          <span className="text-brand-medium dark:text-brand-mint font-bold text-sm">$119,455</span>
                       </div>
                       
                       {[
                         { label: "Property Taxes", value: "-$5,729.28" },
                         { label: "Homeowners Insurance", value: "-$3,378.00" },
                         { label: "Property Management", value: "-$29,863.92" },
                         { label: "Utilities", value: "-$49,670.64" },
                         { label: "LLC Admin & Filing Fees", value: "-$750.00" },
                       ].map((item, i) => (
                         <div key={i} className="flex justify-between items-center">
                            <span className="text-brand-sage dark:text-gray-400 font-medium text-sm">{item.label}</span>
                            <span className="text-brand-dark dark:text-white font-medium text-sm">{item.value}</span>
                         </div>
                       ))}

                       <div className="border-t border-brand-lightGray dark:border-[#3a3a3a] my-2 pt-2 flex justify-between items-center">
                          <span className="text-brand-dark dark:text-white font-bold text-sm">Annual Cash Flow</span>
                          <span className="text-brand-medium dark:text-brand-mint font-bold text-sm">$30,064</span>
                       </div>
                        <div className="flex justify-between items-center">
                          <span className="text-brand-sage dark:text-gray-400 font-medium text-sm">Cap Rate</span>
                          <span className="text-brand-dark dark:text-white font-medium text-sm">5.36%</span>
                       </div>
                    </div>
                 </div>

                 {/* Acquisition Breakdown Section (Screenshot 3) */}
                 <div>
                    <h3 className="font-bold text-brand-dark dark:text-white text-base border-b border-brand-lightGray dark:border-[#3a3a3a] pb-2 mb-3">Acquisition Breakdown</h3>
                    <div className="space-y-3">
                       {[
                         { label: "Underlying Asset Price", value: "$350,000" },
                         { label: "Closing Costs (Insp. & Appr.)", value: "$22,200" },
                         { label: "Upfront DAO Fees", value: "$550" },
                         { label: "Operating Reserve (0%)", value: "$1,147" },
                       ].map((item, i) => (
                         <div key={i} className="flex justify-between items-center">
                            <span className="text-brand-sage dark:text-gray-400 font-medium text-sm">{item.label}</span>
                            <span className="text-brand-dark dark:text-white font-medium text-sm">{item.value}</span>
                         </div>
                       ))}
                       
                       <div className="border-t border-brand-lightGray dark:border-[#3a3a3a] my-2 pt-2 flex justify-between items-center">
                          <span className="text-brand-dark dark:text-white font-bold text-sm">Total Investment Value</span>
                          <span className="text-brand-deep dark:text-brand-mint font-bold text-sm">$373,897</span>
                       </div>
                    </div>
                 </div>

             </div>
         )}
      </div>

      {/* Bottom Action Buttons (Split Buy/Sell) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#101010] p-4 pb-8 z-20 flex gap-4 border-t border-brand-lightGray dark:border-[#3a3a3a] shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <button 
            onClick={() => effectiveOnBuy(property.id, selectedTokens, property.tokenPrice)}
            disabled={property.tokensAvailable === 0 || effectiveBuyState === 'checking'}
            className={`flex-1 font-bold py-3.5 rounded-xl shadow-md active:scale-[0.98] transition-all text-sm ${
              property.tokensAvailable === 0 || effectiveBuyState === 'checking'
                ? 'bg-brand-sage text-white cursor-not-allowed'
                : 'bg-brand-deep text-white hover:bg-brand-dark'
            }`}
          >
             {effectiveBuyState === 'checking' ? (
               <><i className="fa-solid fa-spinner fa-spin mr-2"></i>Checking...</>
             ) : `Buy ${selectedTokens} Token${selectedTokens > 1 ? 's' : ''}`}
          </button>
          <button className="flex-1 bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#3a3a3a] text-brand-deep dark:text-brand-mint font-bold py-3.5 rounded-xl hover:bg-brand-offWhite dark:hover:bg-[#2a2a2a] active:scale-[0.98] transition-all text-sm">
             Sell
          </button>
      </div>

      <PaymentMethodModal
        isOpen={effectiveIsModalOpen}
        onClose={effectiveOnCloseModal}
        paymentMethods={effectivePaymentMethods}
        vaultBalance={effectiveVaultBalance}
        selectedMethod={effectiveSelectedMethod}
        onSelectMethod={effectiveOnSelectMethod}
        onConfirm={() => {
          console.log('Purchase confirmed with method:', effectiveSelectedMethod);
          effectiveOnCloseModal();
        }}
        propertyName={property.title}
        tokenAmount={selectedTokens}
        tokenPrice={property.tokenPrice}
      />
    </div>
  );
};