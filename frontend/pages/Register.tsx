import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSignUp, useAuth } from '@clerk/clerk-react';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const { signUp, isLoaded, setActive } = useSignUp();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (isSignedIn) {
      navigate('/');
    }
  }, [isSignedIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      console.error('Sign up error:', err);
      setError(err.errors?.[0]?.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        navigate('/');
      } else {
        console.log('Verification result:', result);
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.errors?.[0]?.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!isLoaded || !signUp) return;
    
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: window.location.origin + '/sso-callback',
        redirectUrlComplete: window.location.origin + '/#/',
      });
    } catch (err: any) {
      console.error('Google sign up error:', err);
      setError(err.errors?.[0]?.message || 'Failed to sign up with Google.');
    }
  };

  const handleAppleSignUp = async () => {
    if (!isLoaded || !signUp) return;
    
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_apple',
        redirectUrl: window.location.origin + '/sso-callback',
        redirectUrlComplete: window.location.origin + '/#/',
      });
    } catch (err: any) {
      console.error('Apple sign up error:', err);
      setError(err.errors?.[0]?.message || 'Failed to sign up with Apple.');
    }
  };

  if (pendingVerification) {
    return (
      <div className="min-h-screen bg-brand-offWhite flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-logo text-brand-deep uppercase mb-2">Parco Labs</h1>
            <h2 className="text-2xl font-bold text-brand-dark">Verify your email</h2>
            <p className="text-brand-sage mt-2">We sent a verification code to {email}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleVerification} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-brand-black mb-2">Verification Code</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-full px-4 py-3 rounded-lg border border-brand-sage focus:outline-none focus:border-brand-deep focus:ring-1 focus:ring-brand-deep transition-all bg-white text-center text-2xl tracking-widest"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !isLoaded}
              className="w-full bg-brand-deep text-white font-bold py-3.5 rounded-lg hover:bg-brand-dark transition-colors shadow-md disabled:opacity-70"
            >
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <button 
            onClick={() => setPendingVerification(false)}
            className="mt-4 text-sm text-brand-sage hover:text-brand-dark"
          >
            Back to registration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-offWhite flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center md:text-left">
           <h1 className="text-3xl font-logo text-brand-deep uppercase mb-2">Parco Labs</h1>
           <h2 className="text-2xl font-bold text-brand-dark">Create your Parco account</h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-brand-black mb-2">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full px-4 py-3 rounded-lg border border-brand-sage focus:outline-none focus:border-brand-deep focus:ring-1 focus:ring-brand-deep transition-all bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-black mb-2">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-4 py-3 rounded-lg border border-brand-sage focus:outline-none focus:border-brand-deep focus:ring-1 focus:ring-brand-deep transition-all bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-brand-black mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-lg border border-brand-sage focus:outline-none focus:border-brand-deep focus:ring-1 focus:ring-brand-deep transition-all bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-brand-black mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full px-4 py-3 rounded-lg border border-brand-sage focus:outline-none focus:border-brand-deep focus:ring-1 focus:ring-brand-deep transition-all bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-brand-black mb-2">Re-enter Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full px-4 py-3 rounded-lg border border-brand-sage focus:outline-none focus:border-brand-deep focus:ring-1 focus:ring-brand-deep transition-all bg-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !isLoaded}
            className="w-full bg-brand-deep text-white font-bold py-3.5 rounded-lg hover:bg-brand-dark transition-colors shadow-md disabled:opacity-70"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="mt-4 text-center">
            <span className="text-sm text-brand-sage">Already have an account? </span>
            <Link to="/login" className="text-sm font-bold text-brand-deep hover:underline">Sign In</Link>
        </div>

        <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-brand-sage/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-brand-offWhite text-brand-sage">Or sign up with</span>
            </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoogleSignUp}
            type="button"
            className="w-full bg-white border border-brand-dark text-brand-dark font-semibold py-3.5 rounded-lg hover:bg-brand-lightGray transition-colors flex items-center justify-center gap-3"
          >
            <i className="fa-brands fa-google text-lg"></i>
            Sign up with Google
          </button>

          <button
            onClick={handleAppleSignUp}
            type="button"
            className="w-full bg-black text-white font-semibold py-3.5 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-3"
          >
            <i className="fa-brands fa-apple text-lg"></i>
            Sign up with Apple
          </button>
        </div>
      </div>
    </div>
  );
};
