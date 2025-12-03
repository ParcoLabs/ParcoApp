import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth, AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
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
import { PaymentMethods } from './frontend/pages/PaymentMethods';
import { AuthProvider } from './frontend/context/AuthContext';
import { DemoModeProvider } from './frontend/context/DemoModeContext';

const SSOCallbackPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-brand-offWhite flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep mx-auto mb-4"></div>
        <p className="text-brand-sage">Completing sign in...</p>
        <AuthenticateWithRedirectCallback />
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-brand-offWhite flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep"></div>
      </div>
    );
  }

  if (!isSignedIn) {
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

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-brand-offWhite flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep"></div>
      </div>
    );
  }

  if (isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const ViewableRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-brand-offWhite flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep"></div>
      </div>
    );
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

const App: React.FC = () => {
  return (
    <DemoModeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/sso-callback" element={<SSOCallbackPage />} />

            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/marketplace" element={<ViewableRoute><Marketplace /></ViewableRoute>} />
            <Route path="/marketplace/:id" element={<ViewableRoute><TokenDetails /></ViewableRoute>} />
            <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
            <Route path="/defi" element={<ProtectedRoute><DefiPage /></ProtectedRoute>} />
            <Route path="/kyc" element={<ProtectedRoute><KYC /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/payment-methods" element={<ProtectedRoute><PaymentMethods /></ProtectedRoute>} />
            
            <Route path="/borrow" element={<Navigate to="/defi" replace />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </DemoModeProvider>
  );
};

export default App;
