import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SystemConfig {
  demoMode: boolean;
  version: string;
  environment: string;
  features: {
    kyc: boolean;
    payments: boolean;
    blockchain: boolean;
    rentDistribution: boolean;
  };
}

interface DemoModeContextType {
  demoMode: boolean;
  loading: boolean;
  config: SystemConfig | null;
  refetch: () => Promise<void>;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export const DemoModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<SystemConfig | null>(null);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/system/config');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setDemoMode(result.data.demoMode);
          setConfig({
            demoMode: result.data.demoMode,
            version: result.data.version,
            environment: import.meta.env.MODE || 'development',
            features: {
              kyc: result.data.features?.kyc ?? true,
              payments: result.data.features?.stripePayments ?? true,
              blockchain: true,
              rentDistribution: result.data.features?.rentDistribution ?? true,
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch system config:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <DemoModeContext.Provider value={{ demoMode, loading, config, refetch: fetchConfig }}>
      {children}
    </DemoModeContext.Provider>
  );
};

export const useDemoMode = (): DemoModeContextType => {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
};

export const DemoBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { demoMode } = useDemoMode();
  
  if (!demoMode) return null;
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 ${className}`}>
      DEMO
    </span>
  );
};

export const DemoIndicator: React.FC<{ label?: string; className?: string }> = ({ 
  label = 'Demo Mode', 
  className = '' 
}) => {
  const { demoMode, loading } = useDemoMode();
  
  if (loading || !demoMode) return null;
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg ${className}`}>
      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
      <span className="text-sm font-medium text-amber-700">{label}</span>
    </div>
  );
};
