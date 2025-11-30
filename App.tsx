import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
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

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-offWhite flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep"></div>
      </div>
    );
  }

  return (
    <>
      <SignedIn>
        <div className="flex min-h-screen bg-brand-offWhite">
          <Navigation />
          <main className="flex-1 md:ml-64 pb-20 md:pb-0 overflow-y-auto h-screen">
            {children}
          </main>
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn afterSignInUrl={location.pathname} />
      </SignedOut>
    </>
  );
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <SignedIn>
        <Navigate to="/" replace />
      </SignedIn>
      <SignedOut>
        {children}
      </SignedOut>
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

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

export default App;
