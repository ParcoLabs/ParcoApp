import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';

interface DemoStatus {
  user: {
    id: string;
    email: string;
    kycStatus: string;
  };
  vault: {
    balance: number;
    lockedBalance: number;
    totalEarned: number;
  };
  portfolio: {
    totalValue: number;
    totalRentEarned: number;
    holdings: number;
  };
  borrowing: {
    activePositions: number;
    totalBorrowed: number;
  };
  activity: {
    totalTransactions: number;
  };
}

interface DemoBuyResult {
  transaction: {
    id: string;
    type: string;
    amount: number;
    quantity: number;
    propertyName: string;
    txHash: string;
  };
  vault: {
    balance: number;
  };
  portfolio: Array<{
    propertyId: string;
    propertyName: string;
    quantity: number;
    totalInvested: number;
    currentValue: number;
  }>;
}

interface DemoRentResult {
  totalDistributed: number;
  distributions: Array<{
    propertyId: string;
    propertyName: string;
    tokensHeld: number;
    rentAmount: number;
    annualYield: number;
  }>;
  periodStart: string;
  periodEnd: string;
  vault: {
    balance: number;
    totalEarned: number;
  };
}

interface DemoBorrowResult {
  borrowPosition: {
    id: string;
    principal: number;
    interestRate: number;
    collateralValue: number;
    originationFee: number;
    netDisbursement: number;
    status: string;
  };
  vault: {
    balance: number;
    lockedBalance: number;
  };
}

interface DemoRepayResult {
  repayment: {
    amount: number;
    principalPaid: number;
    interestPaid: number;
    isFullRepayment: boolean;
  };
  borrowPosition: {
    id: string;
    remainingPrincipal: number;
    status: string;
  };
  vault: {
    balance: number;
    lockedBalance: number;
  };
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: string;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  totalVotes: number;
  votingEndsAt: string | null;
  createdAt: string;
}

export const useDemo = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshUser } = useAuth();
  const { demoMode } = useDemoMode();

  const setupDemoUser = useCallback(async () => {
    if (!demoMode) {
      setError('Demo mode is not enabled');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/demo/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to setup demo user');
      }

      await refreshUser();
      return data.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [demoMode, refreshUser]);

  const demoBuy = useCallback(async (
    propertyId: string,
    quantity: number
  ): Promise<DemoBuyResult | null> => {
    if (!demoMode) {
      setError('Demo mode is not enabled');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/demo/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ propertyId, quantity }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to process demo purchase');
      }

      return data.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  const runRentCycle = useCallback(async (): Promise<DemoRentResult | null> => {
    if (!demoMode) {
      setError('Demo mode is not enabled');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/demo/run-rent-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to run rent cycle');
      }

      return data.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  const demoBorrow = useCallback(async (
    propertyId: string,
    tokenAmount: number,
    borrowAmount: number
  ): Promise<DemoBorrowResult | null> => {
    if (!demoMode) {
      setError('Demo mode is not enabled');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/demo/borrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ propertyId, tokenAmount, borrowAmount }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to process demo borrow');
      }

      return data.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  const demoRepay = useCallback(async (
    borrowPositionId: string,
    amount: number
  ): Promise<DemoRepayResult | null> => {
    if (!demoMode) {
      setError('Demo mode is not enabled');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/demo/repay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ borrowPositionId, amount }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to process demo repayment');
      }

      return data.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  const getProposals = useCallback(async (): Promise<Proposal[] | null> => {
    if (!demoMode) {
      setError('Demo mode is not enabled');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/demo/proposals', {
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch proposals');
      }

      return data.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  const createProposal = useCallback(async (
    title: string,
    description: string,
    votingDurationDays: number = 7
  ): Promise<Proposal | null> => {
    if (!demoMode) {
      setError('Demo mode is not enabled');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/demo/proposals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, description, votingDurationDays }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create proposal');
      }

      return data.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  const voteOnProposal = useCallback(async (
    proposalId: string,
    choice: 'FOR' | 'AGAINST' | 'ABSTAIN'
  ) => {
    if (!demoMode) {
      setError('Demo mode is not enabled');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/demo/proposals/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ proposalId, choice }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to vote on proposal');
      }

      return data.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  const resetDemo = useCallback(async () => {
    if (!demoMode) {
      setError('Demo mode is not enabled');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/demo/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to reset demo');
      }

      await refreshUser();
      return data.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [demoMode, refreshUser]);

  const getDemoStatus = useCallback(async (): Promise<DemoStatus | null> => {
    if (!demoMode) {
      setError('Demo mode is not enabled');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/demo/status', {
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get demo status');
      }

      return data.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  return {
    loading,
    error,
    demoMode,
    setupDemoUser,
    demoBuy,
    runRentCycle,
    demoBorrow,
    demoRepay,
    getProposals,
    createProposal,
    voteOnProposal,
    resetDemo,
    getDemoStatus,
  };
};
