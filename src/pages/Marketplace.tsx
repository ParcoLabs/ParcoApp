import React, { useState, useMemo, useEffect } from 'react';
import { PropertyCard } from '../components/PropertyCard';
import { MarketplaceMobile } from '../mobile/MarketplaceMobile';
import { MarketplaceGridSkeleton } from '../components/PropertyCardSkeleton';
import { Property } from '../types';
import { MOCK_PROPERTIES } from '../api/mockData';

interface APIProperty {
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
}

const mapAPIPropertyToProperty = (apiProp: APIProperty): Property => ({
  id: apiProp.id,
  title: apiProp.name,
  location: apiProp.region,
  image: apiProp.images[0] || '/placeholder-property.jpg',
  totalValue: apiProp.totalValue,
  rentalYield: apiProp.APY,
  type: apiProp.type as Property['type'],
  chain: apiProp.chain as 'polygon' | 'solana',
  tokensAvailable: apiProp.remainingSupply,
  tokensTotal: apiProp.totalSupply,
  tokenPrice: apiProp.tokenPrice,
  contractAddress: '',
});

export const Marketplace: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/properties');
        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
          const mappedProperties = data.data.map(mapAPIPropertyToProperty);
          setProperties(mappedProperties);
        } else {
          console.warn('API returned no data, falling back to mock data');
          setProperties(MOCK_PROPERTIES);
        }
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError('Unable to load properties. Please try again.');
        setProperties(MOCK_PROPERTIES);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const filteredProperties = useMemo(() => {
    if (activeFilter === 'Highest Yield') {
      return properties.filter(p => p.rentalYield > 10);
    }
    if (activeFilter === 'All') {
      return properties;
    }
    return properties.filter(p => 
      p.type === activeFilter.toUpperCase() || 
      (activeFilter === 'STR' && p.type === 'STR')
    );
  }, [activeFilter, properties]);

  const filters = ['All', 'Residential', 'Commercial', 'STR', 'Highest Yield'];

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    fetch('/api/properties')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data && data.data.length > 0) {
          setProperties(data.data.map(mapAPIPropertyToProperty));
        } else {
          setProperties(MOCK_PROPERTIES);
        }
      })
      .catch(() => {
        setError('Unable to load properties. Please try again.');
        setProperties(MOCK_PROPERTIES);
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Marketplace</h1>
          <p className="text-brand-sage text-sm">Invest in fractionalized real estate starting at $50</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0 sticky top-0 md:static z-10 bg-brand-offWhite py-2 md:py-0">
        {filters.map(f => (
          <button 
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === f 
                ? 'bg-brand-deep text-white' 
                : 'bg-white border border-brand-lightGray text-brand-sage hover:bg-brand-lightGray/50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
            <span className="text-red-700">{error}</span>
          </div>
          <button 
            onClick={handleRetry}
            className="text-red-600 hover:text-red-800 font-medium text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {isLoading ? (
        <>
          <div className="hidden md:block">
            <MarketplaceGridSkeleton />
          </div>
          <div className="md:hidden">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                  <div className="h-48 bg-brand-lightGray rounded-lg mb-3" />
                  <div className="h-5 bg-brand-lightGray rounded w-2/3 mb-2" />
                  <div className="h-4 bg-brand-lightGray rounded w-1/3" />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Vertical stacked list layout for all screen sizes */}
          <div className="flex flex-col gap-4 md:gap-6">
            {filteredProperties.map((prop) => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
          </div>

          {filteredProperties.length === 0 && !isLoading && (
            <div className="text-center py-12 text-brand-sage">
              <i className="fa-solid fa-house-chimney-crack text-4xl mb-3"></i>
              <p>No properties found matching your criteria.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
