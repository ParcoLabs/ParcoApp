import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPropertyById } from '../api/mockData';
import { Property, PropertyType, BlockchainNetwork } from '../types';
import { TokenDetailsMobile } from '../mobile/TokenDetailsMobile';
import { ChainIndicator } from '../components/ChainIndicator';
import { PropertyDetailsSkeletonDesktop, PropertyDetailsSkeletonMobile } from '../components/PropertyDetailsSkeleton';
import { PaymentMethodModal } from '../components/PaymentMethodModal';
import { useBuyFlow } from '../hooks/useBuyFlow';
import { useDemoMode } from '../context/DemoModeContext';
import { useDemo } from '../hooks/useDemo';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const PRICE_HISTORY_DATA = [
  { name: 'Jan', value: 48 },
  { name: 'Feb', value: 49 },
  { name: 'Mar', value: 50 },
  { name: 'Apr', value: 51 },
  { name: 'May', value: 52 },
  { name: 'Jun', value: 54 },
];

const GROWTH_CHART_DATA = [
  { year: '2019', value: 100 },
  { year: '2020', value: 108 },
  { year: '2021', value: 125 },
  { year: '2022', value: 138 },
  { year: '2023', value: 152 },
  { year: '2024', value: 165 },
];

interface ApiPropertyResponse {
  id: string;
  name: string;
  images: string[];
  APY: number;
  totalSupply: number;
  remainingSupply: number;
  description: string | null;
  region: string;
  tokenPrice: number;
  chain: string;
  type: string;
  totalValue: number;
  address?: string;
  squareFeet?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  monthlyRent?: number;
  contractAddress?: string;
}

const mapApiToProperty = (data: ApiPropertyResponse): Property => {
  return {
    id: data.id,
    title: data.name,
    location: data.region,
    totalValue: data.totalValue,
    tokenPrice: data.tokenPrice,
    tokensAvailable: data.remainingSupply,
    tokensTotal: data.totalSupply,
    rentalYield: data.APY,
    image: data.images[0] || '',
    images: data.images,
    description: data.description || undefined,
    type: (data.type as PropertyType) || PropertyType.RESIDENTIAL,
    chain: (data.chain as BlockchainNetwork) || 'polygon',
    contractAddress: data.contractAddress || '',
    address: data.address,
    squareFeet: data.squareFeet,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    yearBuilt: data.yearBuilt,
    monthlyRent: data.monthlyRent,
  };
};

const extractCityName = (location: string): string => {
  const parts = location.split(',');
  return parts[0]?.trim() || location;
};

export const TokenDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenAmount, setTokenAmount] = useState<number>(1);
  
  const {
    state: buyState,
    isModalOpen,
    paymentMethods,
    vaultBalance,
    selectedMethod,
    handleBuy,
    closeModal,
    selectPaymentMethod,
  } = useBuyFlow();
  
  const { demoMode } = useDemoMode();
  const { demoBuy, loading: demoLoading } = useDemo();
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const handlePurchaseConfirm = async () => {
    if (!property || !selectedMethod) return;
    
    setPurchaseError(null);
    
    if (demoMode && selectedMethod.type === 'vault') {
      const result = await demoBuy(property.id, tokenAmount);
      if (result) {
        setPurchaseSuccess(true);
        closeModal();
        setTimeout(() => {
          setPurchaseSuccess(false);
          navigate('/portfolio');
        }, 2000);
      } else {
        setPurchaseError('Purchase failed. Please try again.');
      }
    } else {
      console.log('Purchase confirmed with method:', selectedMethod);
      closeModal();
    }
  };

  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/properties/${id}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          setProperty(mapApiToProperty(result.data));
        } else {
          const mockData = getPropertyById(id);
          if (mockData) {
            setProperty(mockData);
          } else {
            setError('Property not found');
          }
        }
      } catch (err) {
        console.warn('API fetch failed, falling back to mock data:', err);
        const mockData = getPropertyById(id);
        if (mockData) {
          setProperty(mockData);
        } else {
          setError('Property not found');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  if (loading) {
    return (
      <>
        <div className="md:hidden">
          <PropertyDetailsSkeletonMobile />
        </div>
        <div className="hidden md:block">
          <PropertyDetailsSkeletonDesktop />
        </div>
      </>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <i className="fa-solid fa-building text-6xl text-brand-lightGray mb-4"></i>
          <h2 className="text-2xl font-bold text-brand-dark mb-2">Property Not Found</h2>
          <p className="text-brand-sage mb-6">{error || "We couldn't find the property you're looking for."}</p>
          <button 
            onClick={() => navigate('/marketplace')}
            className="px-6 py-3 bg-brand-deep text-white font-bold rounded-lg hover:bg-brand-dark transition-colors"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const cityName = extractCityName(property.location);

  return (
    <>
      {/* Mobile Layout - Keep the same */}
      <div className="md:hidden">
        <TokenDetailsMobile property={property} />
      </div>

      {/* Desktop Layout - Redesigned */}
      <div className="hidden md:block max-w-7xl mx-auto p-6 lg:p-8">
        
        {/* Back Button */}
        <button onClick={() => navigate('/marketplace')} className="text-brand-sage hover:text-brand-dark mb-6 flex items-center gap-2 font-medium">
          <i className="fa-solid fa-arrow-left"></i> Back to Marketplace
        </button>

        {/* Main Grid: Left Content + Right Sticky Invest Box */}
        <div className="flex gap-8">
          
          {/* Left Column - Main Content */}
          <div className="flex-1 space-y-6">
            
            {/* Property Header */}
            <div className="bg-white border border-brand-lightGray rounded-2xl overflow-hidden">
              <div className="relative h-64 lg:h-80">
                <img 
                  src={property.image} 
                  alt={property.title} 
                  className="w-full h-full object-cover bg-brand-lightGray" 
                />
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="bg-brand-deep text-white px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide">
                    {property.type}
                  </span>
                  <ChainIndicator chain={property.chain} size="sm" />
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-brand-sage text-sm mb-2">
                  <i className="fa-solid fa-location-dot"></i>
                  <span>{property.location}</span>
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-brand-dark mb-2">{property.title}</h1>
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-brand-dark">${property.totalValue.toLocaleString()}</span>
                  <span className="text-brand-medium font-semibold">+2.1%</span>
                </div>
              </div>
            </div>

            {/* Overview Section - Dark Panel Style */}
            <div className="bg-brand-dark rounded-2xl p-6 text-white">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <i className="fa-solid fa-info-circle text-brand-medium"></i>
                Overview
              </h2>
              <p className="text-brand-lightGray leading-relaxed">
                {property.description || `This premium ${property.type.toLowerCase()} asset in ${property.location} offers a unique opportunity for fractional ownership. With a projected rental yield of ${property.rentalYield}%, investors can expect steady cash flow distributed directly to their USDC balance. The property is fully managed by our professional property management partners, ensuring hassle-free ownership and consistent returns.`}
              </p>
              
              {/* Key Stats Row */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-brand-sage/30">
                <div>
                  <p className="text-brand-sage text-xs uppercase tracking-wide mb-1">Token Price</p>
                  <p className="text-xl font-bold">${property.tokenPrice}</p>
                </div>
                <div>
                  <p className="text-brand-sage text-xs uppercase tracking-wide mb-1">Rental Yield</p>
                  <p className="text-xl font-bold text-brand-lime">{property.rentalYield}%</p>
                </div>
                <div>
                  <p className="text-brand-sage text-xs uppercase tracking-wide mb-1">Projected Return</p>
                  <p className="text-xl font-bold text-brand-lime">{(property.rentalYield + 2.5).toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* Why City Section */}
            <div className="bg-white border border-brand-lightGray rounded-2xl p-6">
              <h2 className="text-xl font-bold text-brand-dark mb-4">
                Why {cityName}?
              </h2>
              <p className="text-brand-sage leading-relaxed mb-6">
                {cityName} has emerged as one of the most attractive real estate markets in the region, driven by strong economic growth, population influx, and increasing demand for rental properties. The city offers a unique combination of urban amenities and suburban quality of life, making it highly desirable for both young professionals and families. With major employers expanding their presence and infrastructure investments underway, property values have shown consistent appreciation over the past decade.
              </p>
              
              {/* Growth Chart */}
              <div className="bg-brand-offWhite rounded-xl p-4">
                <h3 className="text-sm font-bold text-brand-dark mb-3">Market Growth Index</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={GROWTH_CHART_DATA}>
                      <XAxis 
                        dataKey="year" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#7ebea6', fontSize: 12}} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#7ebea6', fontSize: 12}}
                        domain={[80, 180]}
                      />
                      <Tooltip 
                        contentStyle={{
                          borderRadius: '8px', 
                          border: 'none', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          backgroundColor: '#173726',
                          color: '#fff'
                        }}
                        formatter={(value: number) => [`${value}%`, 'Growth']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#41b39a" 
                        strokeWidth={3}
                        dot={{ fill: '#41b39a', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: '#056052' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Price History Section */}
            <div className="bg-white border border-brand-lightGray rounded-2xl p-6">
              <h2 className="text-xl font-bold text-brand-dark mb-4">Price History</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={PRICE_HISTORY_DATA}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#41b39a" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#41b39a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#7ebea6', fontSize: 12}} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#7ebea6', fontSize: 12}}
                      domain={[40, 60]}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{
                        borderRadius: '8px', 
                        border: 'none', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value: number) => [`$${value}`, 'Token Price']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#41b39a" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Investment Highlights */}
            <div className="bg-white border border-brand-lightGray rounded-2xl p-6">
              <h2 className="text-xl font-bold text-brand-dark mb-4">Investment Highlights</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: 'fa-chart-line', title: 'Strong Returns', desc: 'Consistent rental yield with appreciation potential' },
                  { icon: 'fa-shield-halved', title: 'Fully Insured', desc: 'Comprehensive property and liability coverage' },
                  { icon: 'fa-building', title: 'Professional Management', desc: 'Top-tier property management partners' },
                  { icon: 'fa-clock', title: 'Monthly Distributions', desc: 'Regular rental income to your wallet' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 bg-brand-offWhite rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-brand-mint flex items-center justify-center flex-shrink-0">
                      <i className={`fa-solid ${item.icon} text-brand-deep`}></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-brand-dark text-sm">{item.title}</h4>
                      <p className="text-xs text-brand-sage">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents Section */}
            <div className="bg-white border border-brand-lightGray rounded-2xl p-6">
              <h2 className="text-xl font-bold text-brand-dark mb-4">Documents</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { title: "Property Appraisal", date: "Oct 2024", size: "2.4 MB" },
                  { title: "Operating Agreement", date: "Sep 2024", size: "1.1 MB" },
                  { title: "Rent Roll", date: "Current", size: "850 KB" },
                  { title: "Inspection Report", date: "Aug 2024", size: "3.2 MB" },
                ].map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border border-brand-lightGray rounded-xl hover:bg-brand-offWhite cursor-pointer transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-lightGray flex items-center justify-center text-brand-deep group-hover:bg-brand-mint">
                        <i className="fa-regular fa-file-lines text-lg"></i>
                      </div>
                      <div>
                        <p className="font-bold text-brand-dark text-sm">{doc.title}</p>
                        <p className="text-xs text-brand-sage">{doc.date} &bull; {doc.size}</p>
                      </div>
                    </div>
                    <i className="fa-solid fa-download text-brand-sage group-hover:text-brand-deep"></i>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Sticky Invest Box */}
          <div className="w-80 lg:w-96 flex-shrink-0">
            <div className="bg-white border border-brand-lightGray rounded-2xl p-6 shadow-lg sticky top-6">
              <h3 className="font-bold text-xl text-brand-dark mb-6">Invest</h3>
              
              {/* Key Investment Stats */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center py-3 border-b border-brand-lightGray">
                  <span className="text-brand-sage font-medium">Token Price</span>
                  <span className="font-bold text-brand-dark text-lg">${property.tokenPrice}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-brand-lightGray">
                  <span className="text-brand-sage font-medium">Rental Yield</span>
                  <span className="font-bold text-brand-medium text-lg">{property.rentalYield}%</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-brand-lightGray">
                  <span className="text-brand-sage font-medium">Projected Annual Return</span>
                  <span className="font-bold text-brand-medium text-lg">{(property.rentalYield + 2.5).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-brand-sage font-medium">Max Tokens Available</span>
                  <span className="font-bold text-brand-dark text-lg">{property.tokensAvailable.toLocaleString()}</span>
                </div>
              </div>

              {/* Token Amount Input */}
              <div className="bg-brand-offWhite p-4 rounded-xl mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-bold text-brand-sage uppercase tracking-wide">Amount</span>
                  <button 
                    onClick={() => setTokenAmount(property.tokensAvailable)}
                    className="text-xs font-bold text-brand-deep cursor-pointer hover:underline"
                  >
                    MAX
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    placeholder="0"
                    min="1"
                    max={property.tokensAvailable}
                    value={tokenAmount || ''}
                    onChange={(e) => setTokenAmount(Math.min(Number(e.target.value), property.tokensAvailable))}
                    className="bg-transparent text-2xl font-bold text-brand-dark w-full outline-none" 
                  />
                  <span className="text-brand-sage font-medium">TOKENS</span>
                </div>
                <div className="text-right text-sm text-brand-sage mt-2">
                  ≈ ${(tokenAmount * property.tokenPrice).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USDC
                </div>
              </div>

              {/* Buy/Sell Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button 
                  onClick={() => handleBuy(property.id, tokenAmount, property.tokenPrice)}
                  className={`w-full py-3.5 rounded-xl font-bold text-white shadow-sm transition-all ${
                    property.tokensAvailable === 0 || buyState === 'checking' 
                      ? 'bg-brand-sage cursor-not-allowed' 
                      : 'bg-brand-deep hover:bg-brand-dark'
                  }`}
                  disabled={property.tokensAvailable === 0 || buyState === 'checking'}
                >
                  {buyState === 'checking' ? (
                    <><i className="fa-solid fa-spinner fa-spin mr-2"></i>Checking...</>
                  ) : 'Buy'}
                </button>
                <button 
                  className="w-full py-3.5 rounded-xl font-bold text-brand-deep border-2 border-brand-deep hover:bg-brand-offWhite transition-all"
                >
                  Sell
                </button>
              </div>
              
              <p className="text-xs text-center text-brand-sage">
                By purchasing, you agree to the <span className="underline cursor-pointer hover:text-brand-dark">Terms of Service</span>.
              </p>
            </div>
          </div>
        </div>
      </div>

      <PaymentMethodModal
        isOpen={isModalOpen}
        onClose={closeModal}
        paymentMethods={paymentMethods}
        vaultBalance={vaultBalance}
        selectedMethod={selectedMethod}
        onSelectMethod={selectPaymentMethod}
        onConfirm={handlePurchaseConfirm}
        propertyName={property.title}
        tokenAmount={tokenAmount}
        tokenPrice={property.tokenPrice}
      />

      {purchaseSuccess && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-[300] flex items-center gap-2">
          <i className="fa-solid fa-circle-check"></i>
          Purchase successful! Redirecting to portfolio...
        </div>
      )}

      {purchaseError && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-[300]">
          {purchaseError}
        </div>
      )}
    </>
  );
};
