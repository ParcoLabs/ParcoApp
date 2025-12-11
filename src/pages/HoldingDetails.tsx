import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useDemoMode } from '../context/DemoModeContext';
import { useDemo } from '../hooks/useDemo';
import { getPropertyById } from '../api/mockData';
import { Property } from '../types';

interface HoldingData {
  propertyId: string;
  propertyName: string;
  quantity: number;
  totalInvested: number;
  currentValue: number;
  averageCost: number;
  image: string;
  location: string;
  rentalYield: number;
  monthlyReturns: number;
  allTimeReturns: number;
  priceChange: number;
  tokenPrice: number;
}

interface GovernanceProposal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'passed' | 'rejected' | 'pending';
  votedFor?: boolean;
  votedAgainst?: boolean;
  forVotes: number;
  againstVotes: number;
  endDate: string;
  propertyId: string;
}

const generatePriceData = (basePrice: number, period: string) => {
  const periods: Record<string, { count: number; labels: string[] }> = {
    '1D': { count: 24, labels: ['12am', '4am', '8am', '12pm', '4pm', '8pm'] },
    '1W': { count: 7, labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    '1M': { count: 30, labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'] },
    '1Y': { count: 12, labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] },
    'All': { count: 24, labels: ['2022 Q1', '2022 Q2', '2022 Q3', '2022 Q4', '2023 Q1', '2023 Q2', '2023 Q3', '2023 Q4', '2024 Q1', '2024 Q2', '2024 Q3', '2024 Q4'] },
  };
  
  const { count, labels } = periods[period] || periods['1M'];
  const volatility = period === '1D' ? 0.02 : period === '1W' ? 0.05 : 0.1;
  
  return labels.map((label, i) => ({
    name: label,
    value: basePrice * (1 + (Math.random() - 0.3) * volatility * (i / count)),
  }));
};

const DEMO_PROPOSALS: GovernanceProposal[] = [
  {
    id: 'prop-1',
    title: 'Upgrade HVAC System',
    description: 'Replace aging HVAC units with energy-efficient models to reduce operating costs by 15%.',
    status: 'passed',
    votedFor: true,
    forVotes: 850,
    againstVotes: 150,
    endDate: '2024-11-15',
    propertyId: '1',
  },
  {
    id: 'prop-2',
    title: 'Increase Reserve Fund',
    description: 'Allocate additional 2% of rental income to emergency reserve fund.',
    status: 'passed',
    votedFor: true,
    forVotes: 720,
    againstVotes: 280,
    endDate: '2024-10-01',
    propertyId: '1',
  },
  {
    id: 'prop-3',
    title: 'Parking Lot Renovation',
    description: 'Repave and expand parking lot to accommodate 20 additional vehicles.',
    status: 'rejected',
    votedAgainst: true,
    forVotes: 380,
    againstVotes: 620,
    endDate: '2024-09-15',
    propertyId: '3',
  },
  {
    id: 'prop-4',
    title: 'Solar Panel Installation',
    description: 'Install rooftop solar panels to reduce electricity costs and carbon footprint. Expected ROI of 18% over 5 years.',
    status: 'active',
    forVotes: 520,
    againstVotes: 180,
    endDate: '2024-12-31',
    propertyId: '1',
  },
  {
    id: 'prop-5',
    title: 'Pool Area Enhancement',
    description: 'Renovate pool area with new furniture, lighting, and enhanced security systems.',
    status: 'active',
    forVotes: 340,
    againstVotes: 160,
    endDate: '2025-01-15',
    propertyId: '3',
  },
  {
    id: 'prop-6',
    title: 'Rooftop Terrace Addition',
    description: 'Add a rooftop terrace with outdoor seating and ocean views to increase property appeal.',
    status: 'passed',
    votedFor: true,
    forVotes: 680,
    againstVotes: 220,
    endDate: '2024-08-01',
    propertyId: '3',
  },
  {
    id: 'prop-7',
    title: 'EV Charging Stations',
    description: 'Install 10 electric vehicle charging stations in the parking garage.',
    status: 'active',
    forVotes: 450,
    againstVotes: 200,
    endDate: '2025-02-01',
    propertyId: '5',
  },
  {
    id: 'prop-8',
    title: 'Conference Room Upgrade',
    description: 'Upgrade conference rooms with new AV equipment and modern furniture.',
    status: 'passed',
    votedFor: true,
    forVotes: 780,
    againstVotes: 120,
    endDate: '2024-10-15',
    propertyId: '5',
  },
];

export const HoldingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { demoMode } = useDemoMode();
  const { getDemoStatus } = useDemo();
  
  const [holding, setHolding] = useState<HoldingData | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Balance');
  const [chartPeriod, setChartPeriod] = useState('1M');
  const [chartData, setChartData] = useState<any[]>([]);
  const [proposals, setProposals] = useState<GovernanceProposal[]>([]);

  useEffect(() => {
    const fetchHolding = async () => {
      if (!id) return;
      
      setLoading(true);
      
      try {
        const mockProperty = getPropertyById(id);
        
        if (demoMode) {
          const response = await fetch('/api/demo/portfolio', {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data.holdings) {
              const foundHolding = data.data.holdings.find((h: any) => h.propertyId === id);
              if (foundHolding) {
                setHolding({
                  propertyId: foundHolding.propertyId,
                  propertyName: foundHolding.propertyName,
                  quantity: foundHolding.quantity,
                  totalInvested: foundHolding.totalInvested,
                  currentValue: foundHolding.currentValue,
                  averageCost: foundHolding.totalInvested / foundHolding.quantity,
                  image: mockProperty?.image || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400',
                  location: mockProperty?.location || 'USA',
                  rentalYield: mockProperty?.rentalYield || 9.8,
                  monthlyReturns: 9.8,
                  allTimeReturns: 11.2,
                  priceChange: 2.1,
                  tokenPrice: mockProperty?.tokenPrice || 50,
                });
              }
            }
          }
          
          const propertyProposals = DEMO_PROPOSALS.filter(p => p.propertyId === id);
          setProposals(propertyProposals);
        }
        
        if (mockProperty) {
          setProperty(mockProperty);
        }
      } catch (error) {
        console.error('Error fetching holding:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHolding();
  }, [id, demoMode]);

  useEffect(() => {
    if (holding) {
      setChartData(generatePriceData(holding.currentValue, chartPeriod));
    }
  }, [holding, chartPeriod]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#101010]">
        <div className="animate-pulse p-6 space-y-6">
          <div className="h-8 bg-brand-lightGray dark:bg-[#2a2a2a] rounded w-1/4"></div>
          <div className="h-48 bg-brand-lightGray dark:bg-[#2a2a2a] rounded"></div>
          <div className="h-32 bg-brand-lightGray dark:bg-[#2a2a2a] rounded"></div>
        </div>
      </div>
    );
  }

  if (!holding && !property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <i className="fa-solid fa-coins text-6xl text-brand-lightGray mb-4"></i>
          <h2 className="text-2xl font-bold text-brand-dark dark:text-white mb-2">Holding Not Found</h2>
          <p className="text-brand-sage dark:text-gray-400 mb-6">You don't own any tokens for this property.</p>
          <button 
            onClick={() => navigate('/portfolio')}
            className="px-6 py-3 bg-brand-deep text-white font-bold rounded-lg hover:bg-brand-dark transition-colors"
          >
            Back to Portfolio
          </button>
        </div>
      </div>
    );
  }

  const displayData = holding || {
    propertyId: property?.id || '',
    propertyName: property?.title || '',
    quantity: 0,
    totalInvested: 0,
    currentValue: 0,
    averageCost: 0,
    image: property?.image || '',
    location: property?.location || '',
    rentalYield: property?.rentalYield || 0,
    monthlyReturns: 0,
    allTimeReturns: 0,
    priceChange: 0,
    tokenPrice: property?.tokenPrice || 0,
  };

  const currentPrice = displayData.currentValue;
  const latestChartValue = chartData.length > 0 ? chartData[chartData.length - 1].value : currentPrice;

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden min-h-screen bg-white dark:bg-[#101010] pb-32">
        <div className="sticky top-0 z-10 bg-white dark:bg-[#101010] px-4 py-3 flex items-center">
          <button onClick={() => navigate('/portfolio')} className="p-2 -ml-2">
            <i className="fa-solid fa-arrow-left text-brand-dark dark:text-white text-lg"></i>
          </button>
        </div>

        <div className="px-4 pb-4">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-brand-dark dark:text-white">{displayData.propertyName}</h1>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-brand-dark dark:text-white">${displayData.currentValue.toLocaleString()}</span>
                <span className={`text-sm font-bold ${displayData.priceChange >= 0 ? 'text-brand-medium' : 'text-red-500'}`}>
                  {displayData.priceChange >= 0 ? '+' : ''}{displayData.priceChange}%
                </span>
              </div>
            </div>
            <img 
              src={displayData.image} 
              alt={displayData.propertyName}
              className="w-16 h-16 rounded-lg object-cover shadow-sm"
            />
          </div>

          {/* Price Chart */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 mb-4 shadow-sm border border-brand-lightGray dark:border-[#2a2a2a]">
            <div className="h-40 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValueMobile" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#41b39a" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#41b39a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#7ebea6', fontSize: 10}} />
                  <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                  />
                  <Area type="monotone" dataKey="value" stroke="#41b39a" strokeWidth={2} fillOpacity={1} fill="url(#colorValueMobile)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-2">
              {['1D', '1W', '1M', '1Y', 'All'].map(period => (
                <button
                  key={period}
                  onClick={() => setChartPeriod(period)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    chartPeriod === period 
                      ? 'bg-brand-deep text-white' 
                      : 'bg-brand-lightGray dark:bg-[#2a2a2a] text-brand-sage dark:text-gray-400 hover:bg-brand-mint dark:bg-[#2a2a2a]'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-brand-lightGray dark:border-[#2a2a2a] mb-4">
            {['Balance', 'Insights', 'Governance'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${
                  activeTab === tab 
                    ? 'border-b-2 border-brand-deep text-brand-deep' 
                    : 'text-brand-sage dark:text-gray-400'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'Balance' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 border border-brand-lightGray dark:border-[#2a2a2a]">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-2xl font-bold text-brand-dark dark:text-white">${displayData.currentValue.toLocaleString()}</span>
                  <span className="text-brand-sage dark:text-gray-400 font-medium">{displayData.quantity} {displayData.propertyName.split(' ')[0]}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-brand-sage dark:text-gray-400">Monthly Returns</span>
                    <span className="font-bold text-brand-medium dark:text-brand-mint dark:text-brand-mint">{displayData.monthlyReturns}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-sage dark:text-gray-400">All-time returns</span>
                    <span className="font-bold text-brand-medium dark:text-brand-mint dark:text-brand-mint">{displayData.allTimeReturns}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-sage dark:text-gray-400">Total Invested</span>
                    <span className="font-bold text-brand-dark dark:text-white">${displayData.totalInvested.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-sage dark:text-gray-400">Token Price</span>
                    <span className="font-bold text-brand-dark dark:text-white">${displayData.tokenPrice}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Insights' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 border border-brand-lightGray dark:border-[#2a2a2a]">
                <h3 className="font-bold text-brand-dark dark:text-white mb-3">Property Details</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-2">
                    <i className="fa-solid fa-location-dot text-brand-medium dark:text-brand-mint mt-0.5"></i>
                    <span className="text-brand-sage dark:text-gray-400">{displayData.location}</span>
                  </li>
                  <li className="flex gap-2">
                    <i className="fa-solid fa-percent text-brand-medium dark:text-brand-mint mt-0.5"></i>
                    <span className="text-brand-sage dark:text-gray-400">Rental Yield: {displayData.rentalYield}%</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 border border-brand-lightGray dark:border-[#2a2a2a]">
                <h3 className="font-bold text-brand-dark dark:text-white mb-3">Key Insights</h3>
                <ul className="space-y-3 text-sm text-brand-sage dark:text-gray-400">
                  <li className="flex gap-2">
                    <i className="fa-solid fa-chart-line text-brand-medium dark:text-brand-mint dark:text-brand-mint"></i>
                    <span>Strong rental demand in area</span>
                  </li>
                  <li className="flex gap-2">
                    <i className="fa-solid fa-building text-brand-medium dark:text-brand-mint dark:text-brand-mint"></i>
                    <span>Property fully occupied</span>
                  </li>
                  <li className="flex gap-2">
                    <i className="fa-solid fa-arrow-trend-up text-brand-medium dark:text-brand-mint dark:text-brand-mint"></i>
                    <span>Appreciation above market average</span>
                  </li>
                  <li className="flex gap-2">
                    <i className="fa-solid fa-shield-check text-brand-medium dark:text-brand-mint dark:text-brand-mint"></i>
                    <span>Professional property management</span>
                  </li>
                </ul>
              </div>

              {property && (
                <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 border border-brand-lightGray dark:border-[#2a2a2a]">
                  <h3 className="font-bold text-brand-dark dark:text-white mb-3">About this Property</h3>
                  <p className="text-sm text-brand-sage dark:text-gray-400 leading-relaxed">
                    {property.description || `Premium ${property.type.toLowerCase()} asset in ${property.location} with strong rental income and appreciation potential.`}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Governance' && (
            <div className="space-y-4">
              {demoMode && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                  <span className="text-xs text-amber-800">Demo Governance - Vote on property proposals</span>
                </div>
              )}
              
              {proposals.filter(p => p.status === 'active').length > 0 && (
                <div>
                  <h3 className="font-bold text-brand-dark dark:text-white mb-3">Active Proposals</h3>
                  {proposals.filter(p => p.status === 'active').map(proposal => (
                    <Link
                      key={proposal.id}
                      to={`/governance?proposal=${proposal.id}`}
                      className="block bg-white dark:bg-[#1a1a1a] rounded-xl p-4 border border-brand-mint mb-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-brand-dark dark:text-white">{proposal.title}</span>
                        <span className="bg-brand-mint dark:bg-[#2a2a2a] text-brand-deep text-xs px-2 py-1 rounded-full font-bold">VOTE</span>
                      </div>
                      <p className="text-sm text-brand-sage dark:text-gray-400 mb-3 line-clamp-2">{proposal.description}</p>
                      <div className="flex justify-between text-xs text-brand-sage dark:text-gray-400">
                        <span>Ends {new Date(proposal.endDate).toLocaleDateString()}</span>
                        <span>{proposal.forVotes + proposal.againstVotes} votes</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <div>
                <h3 className="font-bold text-brand-dark dark:text-white mb-3">Past Votes</h3>
                {proposals.filter(p => p.status !== 'active').map(proposal => (
                  <div
                    key={proposal.id}
                    className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 border border-brand-lightGray dark:border-[#2a2a2a] mb-3"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-brand-dark dark:text-white">{proposal.title}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                        proposal.status === 'passed' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {proposal.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-brand-sage dark:text-gray-400 mb-2 line-clamp-2">{proposal.description}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-xs">
                        {proposal.votedFor && (
                          <span className="text-green-600 font-medium">
                            <i className="fa-solid fa-check mr-1"></i>You voted FOR
                          </span>
                        )}
                        {proposal.votedAgainst && (
                          <span className="text-red-600 font-medium">
                            <i className="fa-solid fa-xmark mr-1"></i>You voted AGAINST
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-brand-sage dark:text-gray-400">
                        {proposal.forVotes} for / {proposal.againstVotes} against
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fixed Bottom Buttons */}
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-white dark:bg-[#101010] border-t border-brand-lightGray dark:border-[#2a2a2a]">
          <div className="flex gap-3">
            <Link
              to={`/marketplace/${displayData.propertyId}`}
              className="flex-1 bg-brand-deep text-white font-bold py-3 rounded-xl text-center hover:bg-brand-dark transition-colors"
            >
              Buy & Sell
            </Link>
            <Link
              to="/defi"
              className="flex-1 bg-white dark:bg-[#1a1a1a] border-2 border-brand-deep text-brand-deep font-bold py-3 rounded-xl text-center hover:bg-brand-mint dark:bg-[#2a2a2a] transition-colors"
            >
              DeFi
            </Link>
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block max-w-6xl mx-auto p-8">
        <button 
          onClick={() => navigate('/portfolio')} 
          className="text-brand-sage dark:text-gray-400 hover:text-brand-dark dark:text-white mb-6 flex items-center gap-2 font-medium"
        >
          <i className="fa-solid fa-arrow-left"></i> Back to Portfolio
        </button>

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-6">
            {/* Header */}
            <div className="flex gap-6 items-start">
              <img 
                src={displayData.image} 
                alt={displayData.propertyName}
                className="w-24 h-24 rounded-xl object-cover shadow-sm"
              />
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-brand-dark dark:text-white mb-1">{displayData.propertyName}</h1>
                <p className="text-brand-sage dark:text-gray-400 mb-2">
                  <i className="fa-solid fa-location-dot mr-1"></i>{displayData.location}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-brand-dark dark:text-white">${displayData.currentValue.toLocaleString()}</span>
                  <span className={`px-2 py-1 rounded text-sm font-bold ${
                    displayData.priceChange >= 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {displayData.priceChange >= 0 ? '+' : ''}{displayData.priceChange}%
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <Link
                  to={`/marketplace/${displayData.propertyId}`}
                  className="px-6 py-2 bg-brand-deep text-white font-bold rounded-lg hover:bg-brand-dark transition-colors"
                >
                  Buy & Sell
                </Link>
                <Link
                  to="/defi"
                  className="px-6 py-2 bg-white dark:bg-[#1a1a1a] border-2 border-brand-deep text-brand-deep font-bold rounded-lg hover:bg-brand-mint dark:bg-[#2a2a2a] transition-colors"
                >
                  DeFi
                </Link>
              </div>
            </div>

            {/* Price Chart */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 shadow-sm border border-brand-lightGray dark:border-[#2a2a2a]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-brand-dark dark:text-white">Price History</h3>
                <div className="flex gap-2">
                  {['1D', '1W', '1M', '1Y', 'All'].map(period => (
                    <button
                      key={period}
                      onClick={() => setChartPeriod(period)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                        chartPeriod === period 
                          ? 'bg-brand-deep text-white' 
                          : 'bg-brand-lightGray dark:bg-[#2a2a2a] text-brand-sage dark:text-gray-400 hover:bg-brand-mint dark:bg-[#2a2a2a]'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValueDesktop" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#41b39a" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#41b39a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#7ebea6', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#7ebea6', fontSize: 12}} domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip 
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                    />
                    <Area type="monotone" dataKey="value" stroke="#41b39a" strokeWidth={2} fillOpacity={1} fill="url(#colorValueDesktop)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabs */}
            <div>
              <div className="flex border-b border-brand-lightGray dark:border-[#2a2a2a] mb-6">
                {['Balance', 'Insights', 'Governance'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 font-semibold text-sm transition-colors ${
                      activeTab === tab 
                        ? 'border-b-2 border-brand-deep text-brand-deep' 
                        : 'text-brand-sage dark:text-gray-400 hover:text-brand-dark dark:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'Balance' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-brand-mint dark:bg-[#2a2a2a]/20 border border-brand-mint rounded-xl p-6">
                    <h3 className="font-bold text-brand-dark dark:text-white mb-4">Your Position</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-brand-sage dark:text-gray-400">Total Value</span>
                        <span className="font-bold text-brand-dark dark:text-white text-xl">${displayData.currentValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-brand-sage dark:text-gray-400">Tokens Owned</span>
                        <span className="font-bold text-brand-dark dark:text-white">{displayData.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-brand-sage dark:text-gray-400">Avg. Cost per Token</span>
                        <span className="font-bold text-brand-dark dark:text-white">${displayData.averageCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-brand-sage dark:text-gray-400">Total Invested</span>
                        <span className="font-bold text-brand-dark dark:text-white">${displayData.totalInvested.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-6">
                    <h3 className="font-bold text-brand-dark dark:text-white mb-4">Returns</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-brand-sage dark:text-gray-400">Monthly Returns</span>
                        <span className="font-bold text-brand-medium dark:text-brand-mint text-xl">{displayData.monthlyReturns}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-brand-sage dark:text-gray-400">All-time Returns</span>
                        <span className="font-bold text-brand-medium dark:text-brand-mint dark:text-brand-mint">{displayData.allTimeReturns}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-brand-sage dark:text-gray-400">Rental Yield</span>
                        <span className="font-bold text-brand-medium dark:text-brand-mint dark:text-brand-mint">{displayData.rentalYield}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-brand-sage dark:text-gray-400">Price Change</span>
                        <span className={`font-bold ${displayData.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {displayData.priceChange >= 0 ? '+' : ''}{displayData.priceChange}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'Insights' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-6">
                    <h3 className="font-bold text-brand-dark dark:text-white mb-4">Property Details</h3>
                    <ul className="space-y-3 text-sm text-brand-sage dark:text-gray-400">
                      <li className="flex gap-3">
                        <i className="fa-solid fa-location-dot text-brand-medium dark:text-brand-mint mt-0.5"></i>
                        <span><strong className="text-brand-dark dark:text-white">Location:</strong> {displayData.location}</span>
                      </li>
                      <li className="flex gap-3">
                        <i className="fa-solid fa-percent text-brand-medium dark:text-brand-mint mt-0.5"></i>
                        <span><strong className="text-brand-dark dark:text-white">Rental Yield:</strong> {displayData.rentalYield}%</span>
                      </li>
                      <li className="flex gap-3">
                        <i className="fa-solid fa-tag text-brand-medium dark:text-brand-mint mt-0.5"></i>
                        <span><strong className="text-brand-dark dark:text-white">Token Price:</strong> ${displayData.tokenPrice}</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-6">
                    <h3 className="font-bold text-brand-dark dark:text-white mb-4">Key Insights</h3>
                    <ul className="space-y-3 text-sm text-brand-sage dark:text-gray-400">
                      <li className="flex gap-3">
                        <i className="fa-solid fa-chart-line text-brand-medium dark:text-brand-mint dark:text-brand-mint"></i>
                        <span>Strong rental demand in the area</span>
                      </li>
                      <li className="flex gap-3">
                        <i className="fa-solid fa-building text-brand-medium dark:text-brand-mint dark:text-brand-mint"></i>
                        <span>Property fully occupied with quality tenants</span>
                      </li>
                      <li className="flex gap-3">
                        <i className="fa-solid fa-arrow-trend-up text-brand-medium dark:text-brand-mint dark:text-brand-mint"></i>
                        <span>Appreciation above market average</span>
                      </li>
                      <li className="flex gap-3">
                        <i className="fa-solid fa-shield-check text-brand-medium dark:text-brand-mint dark:text-brand-mint"></i>
                        <span>Professional property management</span>
                      </li>
                    </ul>
                  </div>

                  {property && (
                    <div className="col-span-2 bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-xl p-6">
                      <h3 className="font-bold text-brand-dark dark:text-white mb-4">About this Property</h3>
                      <p className="text-brand-sage dark:text-gray-400 leading-relaxed">
                        {property.description || `Premium ${property.type.toLowerCase()} asset in ${property.location} with strong rental income and appreciation potential.`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'Governance' && (
                <div className="space-y-6">
                  {demoMode && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                      <span className="text-sm text-amber-800">Demo Governance - Vote on property improvement proposals</span>
                    </div>
                  )}

                  {proposals.filter(p => p.status === 'active').length > 0 && (
                    <div>
                      <h3 className="font-bold text-brand-dark dark:text-white mb-4">Active Proposals</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {proposals.filter(p => p.status === 'active').map(proposal => (
                          <Link
                            key={proposal.id}
                            to={`/governance?proposal=${proposal.id}`}
                            className="bg-white dark:bg-[#1a1a1a] rounded-xl p-5 border-2 border-brand-mint hover:shadow-lg transition-all"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <span className="font-bold text-brand-dark dark:text-white">{proposal.title}</span>
                              <span className="bg-brand-mint dark:bg-[#2a2a2a] text-brand-deep text-xs px-3 py-1 rounded-full font-bold">VOTE NOW</span>
                            </div>
                            <p className="text-sm text-brand-sage dark:text-gray-400 mb-4 line-clamp-2">{proposal.description}</p>
                            <div className="flex justify-between text-xs text-brand-sage dark:text-gray-400">
                              <span>Ends {new Date(proposal.endDate).toLocaleDateString()}</span>
                              <span>{proposal.forVotes + proposal.againstVotes} total votes</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-bold text-brand-dark dark:text-white mb-4">Past Votes</h3>
                    <div className="space-y-3">
                      {proposals.filter(p => p.status !== 'active').map(proposal => (
                        <div
                          key={proposal.id}
                          className="bg-white dark:bg-[#1a1a1a] rounded-xl p-5 border border-brand-lightGray dark:border-[#2a2a2a]"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <span className="font-bold text-brand-dark dark:text-white">{proposal.title}</span>
                              <p className="text-sm text-brand-sage dark:text-gray-400 mt-1">{proposal.description}</p>
                            </div>
                            <span className={`text-xs px-3 py-1 rounded-full font-bold ml-4 ${
                              proposal.status === 'passed' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {proposal.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-brand-lightGray dark:border-[#2a2a2a]">
                            <div className="flex items-center gap-4">
                              {proposal.votedFor && (
                                <span className="text-green-600 font-medium text-sm">
                                  <i className="fa-solid fa-check-circle mr-1"></i>You voted FOR
                                </span>
                              )}
                              {proposal.votedAgainst && (
                                <span className="text-red-600 font-medium text-sm">
                                  <i className="fa-solid fa-times-circle mr-1"></i>You voted AGAINST
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-brand-sage dark:text-gray-400">
                              <span className="text-green-600">{proposal.forVotes} for</span>
                              <span className="text-red-600">{proposal.againstVotes} against</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1a1a1a] border border-brand-lightGray dark:border-[#2a2a2a] rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-brand-dark dark:text-white mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-brand-sage dark:text-gray-400">Tokens Owned</span>
                  <span className="font-bold text-brand-dark dark:text-white">{displayData.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-sage dark:text-gray-400">Current Value</span>
                  <span className="font-bold text-brand-dark dark:text-white">${displayData.currentValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-sage dark:text-gray-400">Token Price</span>
                  <span className="font-bold text-brand-dark dark:text-white">${displayData.tokenPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-sage dark:text-gray-400">Rental Yield</span>
                  <span className="font-bold text-brand-medium dark:text-brand-mint dark:text-brand-mint">{displayData.rentalYield}%</span>
                </div>
              </div>
            </div>

            <div className="bg-brand-mint dark:bg-[#2a2a2a]/20 border border-brand-mint rounded-2xl p-6">
              <h3 className="font-bold text-brand-dark dark:text-white mb-3">
                <i className="fa-solid fa-lightbulb text-brand-medium dark:text-brand-mint mr-2"></i>
                Tip
              </h3>
              <p className="text-sm text-brand-sage dark:text-gray-400">
                You can use your property tokens as collateral in DeFi to borrow USDC while still earning rental income.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HoldingDetails;
