import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Property } from '../types';

interface PropertyCardProps {
  property: Property;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => prev + 1);
  };

  return (
    <div 
      onClick={() => navigate(`/marketplace/${property.id}`)}
      className="bg-white dark:bg-slate-800 border border-brand-lightGray dark:border-slate-700 rounded-2xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group w-full"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image Section */}
        <div className="relative w-full sm:w-[45%] h-48 sm:h-40 md:h-44 lg:h-48 flex-shrink-0">
          <img 
            src={property.image} 
            alt={property.title} 
            className="w-full h-full object-cover bg-brand-lightGray dark:bg-slate-700" 
          />
          
          {/* Recent Listing Badge */}
          <div className="absolute top-3 left-3">
            <span className="bg-brand-deep text-white text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wide">
              Recent Listing
            </span>
          </div>

          {/* Favorite Heart */}
          <button 
            onClick={handleFavorite}
            className="absolute top-3 right-3 w-8 h-8 bg-white dark:bg-slate-800/80 hover:bg-white dark:bg-slate-800 rounded-full flex items-center justify-center transition-colors"
          >
            <i className={`${isFavorite ? 'fa-solid text-red-500' : 'fa-regular text-brand-sage dark:text-slate-400'} fa-heart`}></i>
          </button>

          {/* Image Navigation Arrows */}
          <button 
            onClick={handlePrevImage}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white dark:bg-slate-800/80 hover:bg-white dark:bg-slate-800 rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
          >
            <i className="fa-solid fa-chevron-left text-brand-dark dark:text-white text-sm"></i>
          </button>
          <button 
            onClick={handleNextImage}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white dark:bg-slate-800/80 hover:bg-white dark:bg-slate-800 rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
          >
            <i className="fa-solid fa-chevron-right text-brand-dark dark:text-white text-sm"></i>
          </button>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-4 md:p-5 flex flex-col justify-between">
          <div>
            {/* Property Name */}
            <h3 className="font-bold text-lg md:text-xl text-brand-dark dark:text-white leading-tight mb-1">
              {property.title}
            </h3>
            
            {/* Location */}
            <p className="text-brand-sage dark:text-slate-400 text-sm mb-4">
              {property.location}
            </p>

            {/* Rental Yield */}
            <p className="text-brand-deep font-bold text-base md:text-lg mb-1">
              {property.rentalYield}% Rental Yield
            </p>
            
            {/* Projected Annual Return */}
            <p className="text-brand-dark dark:text-white text-sm md:text-base">
              {property.rentalYield}% Projected Annual Return
            </p>
          </div>

          {/* Available Tokens Button */}
          <div className="mt-4">
            <div className="inline-block bg-brand-deep text-white font-medium text-sm px-4 py-2 rounded-lg">
              Available: {property.tokensAvailable?.toLocaleString() || 0} tokens at ${property.tokenPrice || 50}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
