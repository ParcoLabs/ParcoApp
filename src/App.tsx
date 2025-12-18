import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth, AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { Navigation } from './components/Navigation';
import { AuthProvider } from './context/AuthContext';
import { DemoModeProvider } from './context/DemoModeContext';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Marketplace = lazy(() => import('./pages/Marketplace').then(m => ({ default: m.Marketplace })));
const TokenDetails = lazy(() => import('./pages/TokenDetails').then(m => ({ default: m.TokenDetails })));
const HoldingDetails = lazy(() => import('./pages/HoldingDetails').then(m => ({ default: m.HoldingDetails })));
const Portfolio = lazy(() => import('./pages/Portfolio').then(m => ({ default: m.Portfolio })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const KYC = lazy(() => import('./pages/KYC').then(m => ({ default: m.KYC })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const DefiPage = lazy(() => import('./pages/defi/DefiPage').then(m => ({ default: m.DefiPage })));
const PaymentMethods = lazy(() => import('./pages/PaymentMethods').then(m => ({ default: m.PaymentMethods })));
const Governance = lazy(() => import('./pages/Governance').then(m => ({ default: m.Governance })));

const AdminLayout = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminLayout })));
const AdminTokenizations = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminTokenizations })));
const AdminProperties = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminProperties })));
const AdminInvestors = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminInvestors })));
const AdminRent = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminRent })));
const AdminDemo = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminDemo })));
const AdminOverview = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminOverview })));

const MyProperties = lazy(() => import('./pages/tokenizer').then(m => ({ default: m.MyProperties })));
const TokenizerDashboard = lazy(() => import('./pages/tokenizer').then(m => ({ default: m.TokenizerDashboard })));
const TokenizerHome = lazy(() => import('./pages/tokenizer').then(m => ({ default: m.TokenizerHome })));
const TokenizerSettings = lazy(() => import('./pages/tokenizer').then(m => ({ default: m.TokenizerSettings })));
const TokenizerLayout = lazy(() => import('./pages/tokenizer').then(m => ({ default: m.TokenizerLayout })));

const PageLoader: React.FC = () => (
  <div className="min-h-screen bg-brand-offWhite dark:bg-[#101010] flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-deep mx-auto"></div>
    </div>
  </div>
);

const SSOCallbackPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-brand-offWhite dark:bg-[#101010] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-deep mx-auto mb-4"></div>
        <p className="text-brand-sage dark:text-gray-400">Completing sign in...</p>
        <AuthenticateWithRedirectCallback />
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return <PageLoader />;
  }

  if (!isSignedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex min-h-screen bg-brand-offWhite dark:bg-[#101010]">
      <Navigation />
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 overflow-y-auto h-screen bg-brand-offWhite dark:bg-[#101010]">
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </main>
    </div>
  );
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <PageLoader />;
  }

  if (isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
};

const ViewableRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return <PageLoader />;
  }

  return (
    <div className="flex min-h-screen bg-brand-offWhite dark:bg-[#101010]">
      <Navigation />
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 overflow-y-auto h-screen bg-brand-offWhite dark:bg-[#101010]">
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </main>
    </div>
  );
};

const TokenizerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return <PageLoader />;
  }

  if (!isSignedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <TokenizerLayout>
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </TokenizerLayout>
    </Suspense>
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
            <Route path="/holdings/:id" element={<ProtectedRoute><HoldingDetails /></ProtectedRoute>} />
            <Route path="/defi" element={<ProtectedRoute><DefiPage /></ProtectedRoute>} />
            <Route path="/governance" element={<ProtectedRoute><Governance /></ProtectedRoute>} />
            <Route path="/kyc" element={<ProtectedRoute><KYC /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/payment-methods" element={<ProtectedRoute><PaymentMethods /></ProtectedRoute>} />
            
            <Route path="/borrow" element={<Navigate to="/defi" replace />} />

            <Route path="/tokenizer" element={<TokenizerRoute><TokenizerHome /></TokenizerRoute>} />
            <Route path="/tokenizer/my-properties" element={<TokenizerRoute><MyProperties /></TokenizerRoute>} />
            <Route path="/tokenizer/dashboard/:id" element={<TokenizerRoute><TokenizerDashboard /></TokenizerRoute>} />
            <Route path="/tokenizer/settings" element={<TokenizerRoute><TokenizerSettings /></TokenizerRoute>} />
            <Route path="/tokenizer/rental-income" element={<TokenizerRoute><TokenizerHome /></TokenizerRoute>} />
            <Route path="/tokenizer/token-holders" element={<TokenizerRoute><TokenizerHome /></TokenizerRoute>} />
            <Route path="/tokenizer/compliance" element={<TokenizerRoute><TokenizerHome /></TokenizerRoute>} />
            <Route path="/tokenizer/notifications" element={<TokenizerRoute><TokenizerHome /></TokenizerRoute>} />
            <Route path="/tokenizer/submit-property" element={<TokenizerRoute><MyProperties /></TokenizerRoute>} />

            <Route path="/admin" element={<Suspense fallback={<PageLoader />}><AdminLayout /></Suspense>}>
              <Route index element={<Suspense fallback={<PageLoader />}><AdminOverview /></Suspense>} />
              <Route path="tokenizations" element={<Suspense fallback={<PageLoader />}><AdminTokenizations /></Suspense>} />
              <Route path="properties" element={<Suspense fallback={<PageLoader />}><AdminProperties /></Suspense>} />
              <Route path="investors" element={<Suspense fallback={<PageLoader />}><AdminInvestors /></Suspense>} />
              <Route path="rent" element={<Suspense fallback={<PageLoader />}><AdminRent /></Suspense>} />
              <Route path="demo" element={<Suspense fallback={<PageLoader />}><AdminDemo /></Suspense>} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </DemoModeProvider>
  );
};

export default App;
