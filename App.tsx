import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navigation } from './frontend/components/Navigation';
import { Dashboard } from './frontend/pages/Dashboard';
import { Marketplace } from './frontend/pages/Marketplace';
import { TokenDetails } from './frontend/pages/TokenDetails';
import { Portfolio } from './frontend/pages/Portfolio';
import { Login } from './frontend/pages/Login';
import { Register } from './frontend/pages/Register';
import { AuthProvider, useAuth } from './frontend/context/AuthContext';
import * as Backend from './backend/architecture';

const Borrow = () => (
    <div className="p-8 text-center text-brand-sage">
        <i className="fa-solid fa-hand-holding-dollar text-4xl mb-4 text-brand-medium"></i>
        <h2 className="text-xl font-bold text-brand-dark">Borrow Vault</h2>
        <p>Get liquidity against your property tokens without selling.</p>
        <div className="mt-8 bg-white p-6 rounded-lg border border-brand-lightGray max-w-md mx-auto text-left">
            <h3 className="font-bold text-sm uppercase text-brand-sage mb-2">Smart Contract</h3>
            <p className="font-mono text-sm text-brand-dark">BorrowVault.sol</p>
            <p className="text-xs mt-2">Manages LTV limits and issues credit lines.</p>
        </div>
    </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
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
        {/* Navigation Layer */}
        <Navigation />

        {/* Main Content Area */}
        <main className="flex-1 md:ml-64 pb-20 md:pb-0 overflow-y-auto h-screen">
          {children}
        </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
          <Route path="/marketplace/:id" element={<ProtectedRoute><TokenDetails /></ProtectedRoute>} />
          <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
          <Route path="/borrow" element={<ProtectedRoute><Borrow /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;