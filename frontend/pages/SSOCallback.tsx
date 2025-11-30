import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

export const SSOCallback: React.FC = () => {
  const { handleRedirectCallback } = useClerk();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await handleRedirectCallback({});
        navigate('/');
      } catch (err) {
        console.error('SSO callback error:', err);
        navigate('/login');
      }
    };

    handleCallback();
  }, [handleRedirectCallback, navigate]);

  return (
    <div className="min-h-screen bg-brand-offWhite flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep mx-auto mb-4"></div>
        <p className="text-brand-sage">Completing sign in...</p>
      </div>
    </div>
  );
};
