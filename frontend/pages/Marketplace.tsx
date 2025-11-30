import React, { useState, useMemo } from 'react';
import { MOCK_PROPERTIES } from '../api/mockData';
import { PropertyCard } from '../components/PropertyCard';
import { MarketplaceMobile } from '../mobile/MarketplaceMobile';

export const Marketplace: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredProperties = useMemo(() => {
    // Simple logic for "Highest Yield"
    if (activeFilter === 'Highest Yield') return MOCK_PROPERTIES.filter(p => p.rentalYield > 10);
    
    const matchesFilter = activeFilter === 'All' || MOCK_PROPERTIES.filter(p => {
       if (activeFilter === 'STR') return p.type === 'STR';
       return p.type.toString() === activeFilter.toUpperCase();
    }).length > 0 ? MOCK_PROPERTIES.filter(p => {
        if (activeFilter === 'STR') return p.type === 'STR';
        return activeFilter === 'All' || p.type.toString() === activeFilter.toUpperCase()
    }) : [];

    // Correct filtering logic
    if (activeFilter === 'Highest Yield') return MOCK_PROPERTIES.filter(p => p.rentalYield > 10);
    if (activeFilter === 'All') return MOCK_PROPERTIES;
    return MOCK_PROPERTIES.filter(p => p.type === activeFilter.toUpperCase() || (activeFilter === 'STR' && p.type === 'STR'));

  }, [activeFilter]);

  const filters = ['All', 'Residential', 'Commercial', 'STR', 'Highest Yield'];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Marketplace</h1>
          <p className="text-brand-sage text-sm">Invest in fractionalized real estate starting at $50</p>
        </div>
      </div>

      {/* Filters */}
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

      {/* Desktop Grid (Adjusted for Horizontal Cards) */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProperties.map((prop) => (
          <PropertyCard key={prop.id} property={prop} />
        ))}
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        <MarketplaceMobile properties={filteredProperties} />
      </div>

      {filteredProperties.length === 0 && (
        <div className="text-center py-12 text-brand-sage">
          <i className="fa-solid fa-house-chimney-crack text-4xl mb-3"></i>
          <p>No properties found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};