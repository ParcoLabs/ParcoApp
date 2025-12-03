import React from 'react';

export const PropertyCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-brand-lightGray rounded-2xl p-3 flex gap-4 h-full items-center animate-pulse">
      <div className="relative shrink-0">
        <div className="w-32 h-32 bg-brand-lightGray rounded-xl" />
      </div>

      <div className="flex-1 flex flex-col justify-between h-32 py-1">
        <div>
          <div className="h-5 bg-brand-lightGray rounded w-3/4 mb-2" />
          <div className="h-4 bg-brand-lightGray rounded w-1/2" />
        </div>

        <div className="h-9 bg-brand-lightGray rounded-full w-24" />
      </div>

      <div className="flex flex-col justify-between h-32 py-1 text-right min-w-[80px]">
        <div>
          <div className="h-3 bg-brand-lightGray rounded w-12 ml-auto mb-1" />
          <div className="h-6 bg-brand-lightGray rounded w-16 ml-auto" />
        </div>

        <div>
          <div className="h-3 bg-brand-lightGray rounded w-8 ml-auto mb-1" />
          <div className="h-7 bg-brand-lightGray rounded w-14 ml-auto" />
        </div>
      </div>
    </div>
  );
};

export const MarketplaceGridSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
};
