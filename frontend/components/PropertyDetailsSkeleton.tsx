import React from 'react';

const shimmer = "animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]";

export const PropertyDetailsSkeletonDesktop: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className={`h-5 w-40 ${shimmer} rounded mb-6`}></div>
      
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-8">
          <div className="flex gap-6">
            <div className={`w-32 h-32 ${shimmer} rounded-xl`}></div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-6 w-24 ${shimmer} rounded`}></div>
                <div className={`h-6 w-20 ${shimmer} rounded`}></div>
                <div className={`h-5 w-32 ${shimmer} rounded`}></div>
              </div>
              <div className={`h-9 w-64 ${shimmer} rounded mb-2`}></div>
              <div className={`h-8 w-48 ${shimmer} rounded`}></div>
            </div>
          </div>

          <div>
            <div className="flex border-b border-brand-lightGray mb-6">
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-10 w-24 ${shimmer} rounded mx-2`}></div>
              ))}
            </div>
            
            <div className={`h-80 ${shimmer} rounded-xl mb-6`}></div>
            
            <div className={`h-32 ${shimmer} rounded-xl mb-6`}></div>
            
            <div className="space-y-3">
              <div className={`h-4 w-full ${shimmer} rounded`}></div>
              <div className={`h-4 w-5/6 ${shimmer} rounded`}></div>
              <div className={`h-4 w-4/5 ${shimmer} rounded`}></div>
            </div>
          </div>
        </div>

        <div className="col-span-1">
          <div className={`${shimmer} rounded-xl p-6 h-96`}></div>
        </div>
      </div>
    </div>
  );
};

export const PropertyDetailsSkeletonMobile: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white pb-24 fixed inset-0 z-[100] overflow-y-auto no-scrollbar">
      <div className="px-4 py-4 flex items-center bg-white sticky top-0 z-20">
        <div className={`w-8 h-8 ${shimmer} rounded-full`}></div>
        <div className={`ml-3 h-5 w-32 ${shimmer} rounded`}></div>
      </div>

      <div className="px-6 flex justify-between items-start mb-4 mt-2">
        <div>
          <div className={`h-9 w-28 ${shimmer} rounded mb-2`}></div>
          <div className={`h-4 w-36 ${shimmer} rounded`}></div>
        </div>
        <div className={`w-14 h-14 ${shimmer} rounded-lg`}></div>
      </div>

      <div className="px-6 mb-4">
        <div className="flex gap-8 border-b border-brand-lightGray pb-3">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-5 w-20 ${shimmer} rounded`}></div>
          ))}
        </div>
      </div>

      <div className={`h-48 mx-6 ${shimmer} rounded-xl mb-4`}></div>

      <div className="flex justify-between px-6 mb-6">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`h-8 w-12 ${shimmer} rounded-full`}></div>
        ))}
      </div>

      <div className="px-6 space-y-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="flex justify-between items-center py-3 border-b border-brand-lightGray/50">
            <div className={`h-4 w-32 ${shimmer} rounded`}></div>
            <div className={`h-4 w-20 ${shimmer} rounded`}></div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 pb-8 z-20 flex gap-4 border-t border-brand-lightGray">
        <div className={`flex-1 h-12 ${shimmer} rounded-xl`}></div>
        <div className={`flex-1 h-12 ${shimmer} rounded-xl`}></div>
      </div>
    </div>
  );
};
