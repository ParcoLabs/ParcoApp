import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ClerkProvider, useClerk } from '@clerk/clerk-react';
import { Navigation } from './frontend/components/Navigation';
import { Dashboard } from './frontend/pages/Dashboard';
import { Marketplace } from './frontend/pages/Marketplace';
import { TokenDetails } from './frontend/pages/TokenDetails';
import { Portfolio } from './frontend/pages/Portfolio';
import { Login } from './frontend/pages/Login';
import { Register } from './frontend/pages/Register';
import { KYC } from './frontend/pages/KYC';
import { Settings } from './frontend/pages/Settings';
import { DefiPage } from './frontend/pages/defi/DefiPage';
import { AuthProvider, useAuth } from './frontend/context/AuthContext';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const SSOCallbackHandler: React.FC = () => {
  const { handleRedirectCallback } = useClerk();

  useEffect(() => {
    if (window.location.pathname === '/sso-callback') {
      handleRedirectCallback({}).catch(console.error);
    }
  }, [handleRedirectCallback]);

  return null;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-offWhite flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex min-h-screen bg-brand-offWhite">
        <Navigation />
        <main className="flex-1 md:ml-64 pb-20 md:pb-0 overflow-y-auto h-screen">
          {children}
        </main>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
          <Route path="/marketplace/:id" element={<ProtectedRoute><TokenDetails /></ProtectedRoute>} />
          <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
          <Route path="/defi" element={<ProtectedRoute><DefiPage /></ProtectedRoute>} />
          <Route path="/kyc" element={<ProtectedRoute><KYC /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          
          <Route path="/borrow" element={<Navigate to="/defi" replace />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

const App: React.FC = () => {
  if (!clerkPubKey) {
    return (
      <div className="min-h-screen bg-brand-offWhite flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-brand-dark mb-4">Configuration Required</h1>
          <p className="text-brand-sage mb-2">Please set your Clerk Publishable Key</p>
          <p className="text-sm text-brand-sage/70">Add VITE_CLERK_PUBLISHABLE_KEY to your environment variables</p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <SSOCallbackHandler />
      <AppRoutes />
    </ClerkProvider>
  );
};

export default App;
