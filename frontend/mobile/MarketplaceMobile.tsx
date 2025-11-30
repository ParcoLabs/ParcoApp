import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Property } from '../../types';

interface MarketplaceMobileProps {
  properties: Property[];
}

export const MarketplaceMobile: React.FC<MarketplaceMobileProps> = ({ properties }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-3 pb-24">
      {properties.map((prop) => (
        <div 
          key={prop.id}
          onClick={() => navigate(`/marketplace/${prop.id}`)}
          className="bg-white border border-brand-lightGray rounded-2xl p-3 flex gap-4 active:scale-[0.98] transition-transform"
        >
          {/* Image */}
          <img 
            src={prop.image} 
            alt={prop.title} 
            className="w-28 h-28 object-cover rounded-xl bg-brand-lightGray shrink-0"
          />
          
          {/* Middle: Info & Button */}
          <div className="flex-1 flex flex-col justify-between py-0.5">
            <div>
              <h3 className="font-bold text-brand-dark text-base leading-tight">{prop.title}</h3>
              <p className="text-xs text-brand-sage font-medium">{prop.location}</p>
            </div>
            
            <button className="bg-brand-deep text-white text-xs font-bold py-2 px-4 rounded-full w-fit uppercase tracking-wide">
               Trade
            </button>
          </div>

          {/* Right: Stats */}
          <div className="flex flex-col justify-between text-right py-0.5 min-w-[70px]">
             <div>
                <p className="text-[9px] text-brand-sage uppercase font-bold">Value</p>
                <p className="font-bold text-brand-dark text-sm">${prop.totalValue.toLocaleString()}</p>
             </div>
             <div>
                 <p className="text-[9px] text-brand-sage uppercase font-bold">APY</p>
                 <span className="inline-block bg-brand-mint text-brand-deep text-xs px-1.5 py-0.5 rounded font-bold">
                   {prop.rentalYield}%
                 </span>
             </div>
          </div>
        </div>
      ))}
    </div>
  );
};