import React from 'react';

export const Landing: React.FC = () => {
  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen bg-brand-offWhite flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-4">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M50 5L93.3013 30V80L50 105L6.69873 80V30L50 5Z" fill="#056052"/>
              <path d="M50 15L85 35V75L50 95L15 75V35L50 15Z" fill="white"/>
              <path d="M50 25V85" stroke="#056052" strokeWidth="8" strokeLinecap="round"/>
              <rect x="42" y="30" width="16" height="50" rx="4" fill="#056052"/>
            </svg>
          </div>
          <h1 className="text-3xl font-logo text-brand-deep uppercase mb-2">Parco Labs</h1>
          <h2 className="text-xl font-bold text-brand-dark mb-4">Invest in Real-World Assets</h2>
          <p className="text-brand-sage mb-8">
            Access tokenized real estate and other real-world assets through our secure investment platform.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleLogin}
            className="w-full bg-brand-deep text-white font-bold py-4 rounded-lg hover:bg-brand-dark transition-colors shadow-md flex items-center justify-center gap-3"
          >
            <i className="fa-solid fa-right-to-bracket text-lg"></i>
            Sign In / Create Account
          </button>
        </div>

        <div className="mt-8 text-sm text-brand-sage">
          <p>Supports Google, GitHub, Apple, and email login</p>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          <div className="p-4">
            <div className="text-2xl font-bold text-brand-deep">$1M+</div>
            <div className="text-xs text-brand-sage">Total Assets</div>
          </div>
          <div className="p-4">
            <div className="text-2xl font-bold text-brand-deep">12%</div>
            <div className="text-xs text-brand-sage">Avg. Returns</div>
          </div>
          <div className="p-4">
            <div className="text-2xl font-bold text-brand-deep">500+</div>
            <div className="text-xs text-brand-sage">Investors</div>
          </div>
        </div>
      </div>
    </div>
  );
};
