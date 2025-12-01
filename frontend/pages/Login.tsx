import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSignIn, useAuth, useClerk } from '@clerk/clerk-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signIn, isLoaded, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (isSignedIn) {
      navigate('/');
    }
  }, [isSignedIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        navigate('/');
      } else {
        console.log('Sign in result:', result);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.errors?.[0]?.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    openSignIn({
      appearance: {
        elements: {
          card: { 
            boxShadow: 'none',
            border: '1px solid #e5e7eb',
            borderRadius: '1rem',
          },
        }
      }
    });
  };

  const handleAppleLogin = () => {
    openSignIn({
      appearance: {
        elements: {
          card: { 
            boxShadow: 'none',
            border: '1px solid #e5e7eb',
            borderRadius: '1rem',
          },
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-brand-offWhite flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center md:text-left">
           <h1 className="text-3xl font-logo text-brand-deep uppercase mb-2">Parco Labs</h1>
           <h2 className="text-2xl font-bold text-brand-dark">Sign in to your Parco account</h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-brand-black">Password</label>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full px-4 py-3 rounded-lg border border-brand-sage focus:outline-none focus:border-brand-deep focus:ring-1 focus:ring-brand-deep transition-all bg-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !isLoaded}
            className="w-full bg-brand-deep text-white font-bold py-3.5 rounded-lg hover:bg-brand-dark transition-colors shadow-md disabled:opacity-70"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-4 flex justify-between items-center text-sm">
             <Link to="/register" className="text-brand-deep font-semibold hover:underline">Create Account</Link>
             <button className="text-brand-sage font-medium hover:text-brand-dark">Forgot Password</button>
        </div>

        <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-brand-sage/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-brand-offWhite text-brand-sage">Or continue with</span>
            </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full bg-white border border-brand-dark text-brand-dark font-semibold py-3.5 rounded-lg hover:bg-brand-lightGray transition-colors flex items-center justify-center gap-3"
          >
            <i className="fa-brands fa-google text-lg"></i>
            Sign in with Google
          </button>

          <button
            onClick={handleAppleLogin}
            type="button"
            className="w-full bg-black text-white font-semibold py-3.5 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-3"
          >
            <i className="fa-brands fa-apple text-lg"></i>
            Sign in with Apple
          </button>
        </div>
      </div>
    </div>
  );
};
