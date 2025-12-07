import React from 'react';

const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;

const ShimmerBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div 
    className={`rounded ${className}`} 
    style={{
      background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite',
    }}
  ></div>
);

export const PropertyDetailsSkeletonDesktop: React.FC = () => {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div className="max-w-6xl mx-auto p-8">
        <ShimmerBox className="h-5 w-40 mb-6" />
        
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-8">
            <div className="flex gap-6">
              <ShimmerBox className="w-32 h-32 rounded-xl" />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <ShimmerBox className="h-6 w-24" />
                  <ShimmerBox className="h-6 w-20" />
                  <ShimmerBox className="h-5 w-32" />
                </div>
                <ShimmerBox className="h-9 w-64 mb-2" />
                <ShimmerBox className="h-8 w-48" />
              </div>
            </div>

            <div>
              <div className="flex border-b border-brand-lightGray mb-6">
                {[1, 2, 3].map(i => (
                  <ShimmerBox key={i} className="h-10 w-24 mx-2" />
                ))}
              </div>
              
              <ShimmerBox className="h-80 rounded-xl mb-6" />
              
              <ShimmerBox className="h-32 rounded-xl mb-6" />
              
              <div className="space-y-3">
                <ShimmerBox className="h-4 w-full" />
                <ShimmerBox className="h-4 w-5/6" />
                <ShimmerBox className="h-4 w-4/5" />
              </div>
            </div>
          </div>

          <div className="col-span-1">
            <ShimmerBox className="rounded-xl h-96" />
          </div>
        </div>
      </div>
    </>
  );
};

export const PropertyDetailsSkeletonMobile: React.FC = () => {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div className="flex flex-col min-h-screen bg-white pb-24 fixed inset-0 z-[100] overflow-y-auto no-scrollbar">
        <div className="px-4 py-4 flex items-center bg-white sticky top-0 z-20">
          <ShimmerBox className="w-8 h-8 rounded-full" />
          <ShimmerBox className="ml-3 h-5 w-32" />
        </div>

        <div className="px-6 flex justify-between items-start mb-4 mt-2">
          <div>
            <ShimmerBox className="h-9 w-28 mb-2" />
            <ShimmerBox className="h-4 w-36" />
          </div>
          <ShimmerBox className="w-14 h-14 rounded-lg" />
        </div>

        <div className="px-6 mb-4">
          <div className="flex gap-8 border-b border-brand-lightGray pb-3">
            {[1, 2, 3].map(i => (
              <ShimmerBox key={i} className="h-5 w-20" />
            ))}
          </div>
        </div>

        <ShimmerBox className="h-48 mx-6 rounded-xl mb-4" />

        <div className="flex justify-between px-6 mb-6">
          {[1, 2, 3, 4, 5].map(i => (
            <ShimmerBox key={i} className="h-8 w-12 rounded-full" />
          ))}
        </div>

        <div className="px-6 space-y-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-brand-lightGray/50">
              <ShimmerBox className="h-4 w-32" />
              <ShimmerBox className="h-4 w-20" />
            </div>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 pb-8 z-20 flex gap-4 border-t border-brand-lightGray">
          <ShimmerBox className="flex-1 h-12 rounded-xl" />
          <ShimmerBox className="flex-1 h-12 rounded-xl" />
        </div>
      </div>
    </>
  );
};
