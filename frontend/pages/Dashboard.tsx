import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandColors } from '../brand';

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

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      
      {/* Top Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-brand-black mb-1">$0.00</h1>
          <p className="text-brand-black text-sm font-bold tracking-wide uppercase">Total Property Value</p>
        </div>
        <button 
          className="bg-brand-deep hover:bg-brand-dark text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm"
          onClick={() => navigate('/kyc')}
        >
          Add Funds
        </button>
      </div>

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