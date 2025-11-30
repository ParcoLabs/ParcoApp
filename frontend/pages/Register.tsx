import React from 'react';
import { SignUp } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';

export const Register: React.FC = () => {
  return (
    <div className="min-h-screen bg-brand-offWhite flex flex-col justify-center items-center p-4 md:p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 md:mb-8 text-center">
          <h1 className="text-2xl md:text-3xl font-logo text-brand-deep uppercase mb-2">Parco Labs</h1>
          <h2 className="text-xl md:text-2xl font-bold text-brand-dark">Create your Parco account</h2>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <SignUp 
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none p-0 bg-transparent',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton: 'bg-white border border-brand-sage text-brand-dark font-semibold py-3 rounded-lg hover:bg-brand-lightGray transition-colors',
                socialButtonsBlockButtonText: 'text-brand-dark',
                dividerLine: 'bg-brand-sage/30',
                dividerText: 'text-brand-sage text-sm',
                formFieldLabel: 'text-sm font-bold text-brand-black mb-2',
                formFieldInput: 'w-full px-4 py-3 rounded-lg border border-brand-sage focus:outline-none focus:border-brand-deep focus:ring-1 focus:ring-brand-deep transition-all bg-white',
                formButtonPrimary: 'w-full bg-brand-deep text-white font-bold py-3.5 rounded-lg hover:bg-brand-dark transition-colors shadow-md',
                footerActionLink: 'text-brand-deep font-semibold hover:underline',
                identityPreviewEditButton: 'text-brand-deep',
                formFieldAction: 'text-brand-sage font-medium hover:text-brand-dark',
                alert: 'rounded-lg',
              },
              layout: {
                socialButtonsPlacement: 'top',
                socialButtonsVariant: 'blockButton',
              },
            }}
            routing="hash"
            path="/register"
            signInUrl="/login"
          />
        </div>

        <div className="mt-4 md:mt-6 text-center">
          <span className="text-sm text-brand-sage">Already have an account? </span>
          <Link to="/login" className="text-sm font-bold text-brand-deep hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
