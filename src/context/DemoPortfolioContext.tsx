import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useDemoMode } from './DemoModeContext';
import { useAuth } from './AuthContext';

interface WalletBalance {
  name: string;
  symbol: string;
  balance: number;
}

interface WalletBalances {
  usdc: WalletBalance;
  btc: WalletBalance;
  parco: WalletBalance;
}

interface PropertyHolding {
  id: string;
  propertyId: string;
  propertyName: string;
  title: string;
  quantity: number;
  tokensOwned: number;
  averageCost: number;
  totalInvested: number;
  currentValue: number;
  totalValue: number;
  lockedQuantity: number;
  availableQuantity: number;
  rentalYield: number;
  tokenPrice: number;
  image: string;
  location: string;
  isDemoHolding: boolean;
  change: number;
}

interface LendingPosition {
  poolId: string;
  poolName: string;
  deposited: number;
  accruedYield: number;
  apy: number;
}

interface BorrowPosition {
  propertyId: string;
  propertyName: string;
  lockedTokens: number;
  borrowedAmount: number;
  ltv: number;
}

interface PortfolioSummary {
  totalBalance: number;
  totalPropertyValue: number;
  totalCryptoValue: number;
  totalInvested: number;
  netGains: number;
  netGainsPercent: number;
  totalRentEarned: number;
  totalLendingDeposits: number;
  totalAccruedYield: number;
  totalBorrowed: number;
  totalLockedValue: number;
}

interface ChartDataPoint {
  name: string;
  value: number;
  date?: string;
}

interface PortfolioContextType {
  loading: boolean;
  error: string | null;
  summary: PortfolioSummary;
  walletBalances: WalletBalances;
  properties: PropertyHolding[];
  lendingPositions: LendingPosition[];
  borrowPositions: BorrowPosition[];
  recentActivity: any[];
  portfolioChartData: ChartDataPoint[];
  refreshPortfolio: () => Promise<void>;
  refreshWalletBalances: () => Promise<void>;
  refreshAll: () => Promise<void>;
  lastRefresh: Date | null;
}

const defaultWalletBalances: WalletBalances = {
  usdc: { name: 'USDC', symbol: 'USDC', balance: 0 },
  btc: { name: 'Bitcoin', symbol: 'BTC', balance: 0 },
  parco: { name: 'Parco Token', symbol: 'PARCO', balance: 0 },
};

const defaultSummary: PortfolioSummary = {
  totalBalance: 0,
  totalPropertyValue: 0,
  totalCryptoValue: 0,
  totalInvested: 0,
  netGains: 0,
  netGainsPercent: 0,
  totalRentEarned: 0,
  totalLendingDeposits: 0,
  totalAccruedYield: 0,
  totalBorrowed: 0,
  totalLockedValue: 0,
};

const DemoPortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const useDemoPortfolio = () => {
  const context = useContext(DemoPortfolioContext);
  if (!context) {
    throw new Error('useDemoPortfolio must be used within a DemoPortfolioProvider');
  }
  return context;
};


export const DemoPortfolioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { demoMode } = useDemoMode();
  const { getToken } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PortfolioSummary>(defaultSummary);
  const [walletBalances, setWalletBalances] = useState<WalletBalances>(defaultWalletBalances);
  const [properties, setProperties] = useState<PropertyHolding[]>([]);
  const [lendingPositions, setLendingPositions] = useState<LendingPosition[]>([]);
  const [borrowPositions, setBorrowPositions] = useState<BorrowPosition[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [portfolioChartData, setPortfolioChartData] = useState<ChartDataPoint[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const getAuthHeaders = useCallback(async () => {
    const token = await getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [getToken]);

  const refreshWalletBalances = useCallback(async () => {
    if (!demoMode) return;
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/demo/wallet-balances', {
        headers,
        credentials: 'include',
      });
      
      const data = await response.json();
      if (data.success && data.data?.balances) {
        setWalletBalances({
          usdc: data.data.balances.usdc || defaultWalletBalances.usdc,
          btc: data.data.balances.btc || defaultWalletBalances.btc,
          parco: data.data.balances.parco || defaultWalletBalances.parco,
        });
      }
    } catch (err: any) {
      console.error('Failed to refresh wallet balances:', err);
    }
  }, [demoMode, getAuthHeaders]);

  const refreshPortfolio = useCallback(async () => {
    if (!demoMode) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const headers = await getAuthHeaders();
      
      const [portfolioRes, lendingRes, borrowRes, historyRes] = await Promise.all([
        fetch('/api/demo/portfolio', { headers, credentials: 'include' }),
        fetch('/api/demo/lending/pools', { headers, credentials: 'include' }),
        fetch('/api/demo/borrowable-holdings', { headers, credentials: 'include' }),
        fetch('/api/demo/portfolio/history', { headers, credentials: 'include' }),
      ]);
      
      const [portfolioData, lendingData, borrowData, historyData] = await Promise.all([
        portfolioRes.json(),
        lendingRes.json(),
        borrowRes.json(),
        historyRes.json(),
      ]);
      
      if (portfolioData.success && portfolioData.data) {
        const pd = portfolioData.data;
        
        const wallets = pd.walletBalances || defaultWalletBalances;
        setWalletBalances({
          usdc: wallets.usdc || defaultWalletBalances.usdc,
          btc: wallets.btc || defaultWalletBalances.btc,
          parco: wallets.parco || defaultWalletBalances.parco,
        });
        
        const props: PropertyHolding[] = (pd.properties || []).map((p: any) => {
          const qty = p.tokensOwned || p.quantity || 0;
          const locked = p.lockedTokens || p.demoLockedQuantity || p.lockedQuantity || 0;
          const price = p.currentPrice || p.tokenPrice || p.averageCost || 0;
          const avgCost = p.avgCost || p.averageCost || price;
          const totalVal = p.totalValue || p.currentValue || (qty * price);
          const propName = p.title || p.propertyName || p.name || 'Unknown Property';
          const changePercent = p.change || 0;
          
          return {
            id: p.id,
            propertyId: p.propertyId || p.id,
            propertyName: propName,
            title: propName,
            quantity: qty,
            tokensOwned: qty,
            averageCost: avgCost,
            totalInvested: p.totalInvested || (qty * avgCost),
            currentValue: totalVal,
            totalValue: totalVal,
            lockedQuantity: locked,
            availableQuantity: qty - locked,
            rentalYield: p.rentalYield || p.apy || 0,
            tokenPrice: price,
            image: p.image || '',
            location: p.location || '',
            isDemoHolding: p.isDemoHolding !== false,
            change: changePercent,
          };
        });
        setProperties(props);
        
        setRecentActivity(pd.recentActivity || []);
        
        const totalPropertyValue = props.reduce((sum, p) => sum + p.currentValue, 0);
        const totalInvested = props.reduce((sum, p) => sum + p.totalInvested, 0);
        const cryptoValue = (wallets.usdc?.balance || 0) + (wallets.btc?.balance || 0) + (wallets.parco?.balance || 0);
        
        let totalLendingDeposits = 0;
        let totalAccruedYield = 0;
        if (lendingData.success && lendingData.data?.pools) {
          const positions: LendingPosition[] = lendingData.data.pools
            .filter((p: any) => p.userDeposit > 0)
            .map((p: any) => ({
              poolId: p.id,
              poolName: p.name,
              deposited: p.userDeposit,
              accruedYield: p.accruedYield || 0,
              apy: p.apy,
            }));
          setLendingPositions(positions);
          totalLendingDeposits = positions.reduce((sum, p) => sum + p.deposited, 0);
          totalAccruedYield = positions.reduce((sum, p) => sum + p.accruedYield, 0);
        }
        
        let totalBorrowed = 0;
        let totalLockedValue = 0;
        if (borrowData.success && borrowData.data?.holdings) {
          const positions: BorrowPosition[] = borrowData.data.holdings
            .filter((h: any) => h.lockedTokens > 0)
            .map((h: any) => ({
              propertyId: h.id,
              propertyName: h.title,
              lockedTokens: h.lockedTokens,
              borrowedAmount: h.lockedTokens * h.tokenPrice * 0.5,
              ltv: 50,
            }));
          setBorrowPositions(positions);
          totalLockedValue = props.reduce((sum, p) => sum + (p.lockedQuantity * p.tokenPrice), 0);
        }
        
        const netGains = totalPropertyValue - totalInvested + totalAccruedYield + (pd.summary?.totalRentEarned || 0);
        const netGainsPercent = totalInvested > 0 ? (netGains / totalInvested) * 100 : 0;
        
        const newSummary: PortfolioSummary = {
          totalBalance: totalPropertyValue + cryptoValue + totalLendingDeposits,
          totalPropertyValue,
          totalCryptoValue: cryptoValue,
          totalInvested,
          netGains,
          netGainsPercent,
          totalRentEarned: pd.summary?.totalRentEarned || 0,
          totalLendingDeposits,
          totalAccruedYield,
          totalBorrowed,
          totalLockedValue,
        };
        setSummary(newSummary);
        
        if (historyData.success && historyData.data?.chartData) {
          setPortfolioChartData(historyData.data.chartData);
        } else {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const now = new Date();
          const fallbackData = [];
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now);
            d.setMonth(d.getMonth() - i);
            const progress = (6 - i) / 6;
            fallbackData.push({
              name: months[d.getMonth()],
              value: Math.round(totalInvested + (newSummary.totalBalance - totalInvested) * progress),
            });
          }
          setPortfolioChartData(fallbackData);
        }
      }
      
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to refresh portfolio:', err);
    } finally {
      setLoading(false);
    }
  }, [demoMode, getAuthHeaders]);

  const refreshAll = useCallback(async () => {
    await refreshPortfolio();
  }, [refreshPortfolio]);

  useEffect(() => {
    if (demoMode) {
      refreshPortfolio();
    } else {
      setSummary(defaultSummary);
      setWalletBalances(defaultWalletBalances);
      setProperties([]);
      setLendingPositions([]);
      setBorrowPositions([]);
      setRecentActivity([]);
      setPortfolioChartData([]);
    }
  }, [demoMode]);

  return (
    <DemoPortfolioContext.Provider
      value={{
        loading,
        error,
        summary,
        walletBalances,
        properties,
        lendingPositions,
        borrowPositions,
        recentActivity,
        portfolioChartData,
        refreshPortfolio,
        refreshWalletBalances,
        refreshAll,
        lastRefresh,
      }}
    >
      {children}
    </DemoPortfolioContext.Provider>
  );
};
