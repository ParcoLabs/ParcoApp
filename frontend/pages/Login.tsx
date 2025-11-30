import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loginWithGoogle, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
    navigate('/');
  };

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-brand-offWhite flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center md:text-left">
           <h1 className="text-3xl font-logo text-brand-deep uppercase mb-2">Parco Labs</h1>
           <h2 className="text-2xl font-bold text-brand-dark">Sign in to your Parco account</h2>
        </div>

        {/* Form */}
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
            disabled={isLoading}
            className="w-full bg-brand-deep text-white font-bold py-3.5 rounded-lg hover:bg-brand-dark transition-colors shadow-md disabled:opacity-70"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-4 flex justify-between items-center text-sm">
             <Link to="/register" className="text-brand-deep font-semibold hover:underline">Create Account</Link>
             <button className="text-brand-sage font-medium hover:text-brand-dark">Forgot Password</button>
        </div>

        {/* Divider */}
        <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-brand-sage/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-brand-offWhite text-brand-sage">Or continue with</span>
            </div>
        </div>

        {/* Google Button */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full bg-white border border-brand-dark text-brand-dark font-semibold py-3.5 rounded-lg hover:bg-brand-lightGray transition-colors flex items-center justify-center gap-3"
        >
          <i className="fa-brands fa-google text-lg"></i>
          Sign in with Google
        </button>
      </div>
    </div>
  );
};