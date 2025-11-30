
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import * as Backend from './backend/architecture';

// Protected Route Wrapper
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
          <Route path="/defi" element={<ProtectedRoute><DefiPage /></ProtectedRoute>} />
          <Route path="/kyc" element={<ProtectedRoute><KYC /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          
          {/* Redirect Borrow to Defi for legacy links */}
          <Route path="/borrow" element={<Navigate to="/defi" replace />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
