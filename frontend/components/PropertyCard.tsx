import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Property } from '../../types';

interface PropertyCardProps {
  property: Property;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(`/marketplace/${property.id}`)}
      className="bg-white border border-brand-lightGray rounded-2xl p-3 flex gap-4 hover:shadow-lg transition-all cursor-pointer group h-full items-center"
    >
      {/* Image (Left) */}
      <img 
        src={property.image} 
        alt={property.title} 
        className="w-32 h-32 object-cover rounded-xl bg-brand-lightGray shrink-0" 
      />

      {/* Middle Content (Title, Loc, Trade Button) */}
      <div className="flex-1 flex flex-col justify-between h-32 py-1">
        <div>
           <h3 className="font-bold text-lg text-brand-dark leading-tight">{property.title}</h3>
           <p className="text-brand-sage text-sm font-medium">{property.location}</p>
        </div>

        <button className="bg-brand-deep hover:bg-brand-dark text-white font-bold text-sm py-2 px-6 rounded-full w-fit shadow-sm transition-colors uppercase tracking-wide">
          Trade
        </button>
      </div>

      {/* Right Content (Stats) */}
      <div className="flex flex-col justify-between h-32 py-1 text-right min-w-[80px]">
         <div>
            <p className="text-[10px] text-brand-sage uppercase font-bold tracking-wider">Value</p>
            <p className="text-brand-dark font-bold text-lg">${property.totalValue.toLocaleString()}</p>
         </div>

         <div>
            <p className="text-[10px] text-brand-sage uppercase font-bold tracking-wider">APY</p>
            <div className="inline-block bg-brand-mint text-brand-deep px-2 py-1 rounded-md text-sm font-bold">
               {property.rentalYield}%
            </div>
         </div>
      </div>
    </div>
  );
};