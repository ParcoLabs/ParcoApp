import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

export type BuyFlowState = 'idle' | 'checking' | 'ready' | 'processing' | 'error';

export interface KycStatus {
  status: 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  level?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'vault' | 'crypto';
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  bankName?: string;
  isDefault?: boolean;
  balance?: number;
}

export interface UseBuyFlowResult {
  state: BuyFlowState;
  error: string | null;
  isModalOpen: boolean;
  paymentMethods: PaymentMethod[];
  vaultBalance: number;
  selectedPropertyId: string | null;
  handleBuy: (propertyId: string, tokenAmount?: number, pricePerToken?: number) => Promise<void>;
  closeModal: () => void;
  selectPaymentMethod: (method: PaymentMethod) => void;
  selectedMethod: PaymentMethod | null;
}

export const useBuyFlow = (): UseBuyFlowResult => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn, isLoaded } = useAuth();

  const [state, setState] = useState<BuyFlowState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [vaultBalance, setVaultBalance] = useState(0);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const checkKycStatus = async (): Promise<KycStatus> => {
    try {
      const response = await fetch('/api/kyc/sumsub/status', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        return { status: 'NOT_STARTED' };
      }
      
      const data = await response.json();
      return {
        status: data.status || 'NOT_STARTED',
        level: data.level,
      };
    } catch (err) {
      console.error('Failed to fetch KYC status:', err);
      return { status: 'NOT_STARTED' };
    }
  };

  const fetchPaymentMethods = async (): Promise<PaymentMethod[]> => {
    try {
      const response = await fetch('/api/payments/methods', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return data.methods || [];
    } catch (err) {
      console.error('Failed to fetch payment methods:', err);
      return [];
    }
  };

  const fetchVaultBalance = async (): Promise<number> => {
    try {
      const response = await fetch('/api/portfolio', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        return 0;
      }
      
      const data = await response.json();
      return data.vault?.availableBalance || 0;
    } catch (err) {
      console.error('Failed to fetch vault balance:', err);
      return 0;
    }
  };

  const handleBuy = useCallback(async (propertyId: string, tokenAmount?: number, pricePerToken?: number) => {
    setError(null);
    setSelectedPropertyId(propertyId);

    if (!isLoaded) {
      return;
    }

    setState('checking');

    if (!isSignedIn) {
      navigate('/login', { 
        state: { redirectUrl: location.pathname } 
      });
      setState('idle');
      return;
    }

    try {
      const kycStatus = await checkKycStatus();
      
      if (kycStatus.status !== 'APPROVED') {
        navigate('/kyc');
        setState('idle');
        return;
      }

      const [methods, balance] = await Promise.all([
        fetchPaymentMethods(),
        fetchVaultBalance(),
      ]);

      const allMethods: PaymentMethod[] = [
        {
          id: 'vault',
          type: 'vault' as const,
          balance: balance,
        },
        ...methods.map((m: any): PaymentMethod => ({
          id: m.id,
          type: (m.type === 'card' ? 'card' : 'bank') as 'card' | 'bank',
          brand: m.brand,
          last4: m.last4,
          expMonth: m.expMonth,
          expYear: m.expYear,
          bankName: m.bankName,
          isDefault: m.isDefault,
        })),
        {
          id: 'crypto',
          type: 'crypto' as const,
        },
      ];

      setPaymentMethods(allMethods);
      setVaultBalance(balance);
      setIsModalOpen(true);
      setState('ready');
    } catch (err) {
      console.error('Buy flow error:', err);
      setError('Something went wrong. Please try again.');
      setState('error');
    }
  }, [isLoaded, isSignedIn, navigate, location.pathname]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedPropertyId(null);
    setSelectedMethod(null);
    setState('idle');
  }, []);

  const selectPaymentMethod = useCallback((method: PaymentMethod) => {
    setSelectedMethod(method);
  }, []);

  return {
    state,
    error,
    isModalOpen,
    paymentMethods,
    vaultBalance,
    selectedPropertyId,
    handleBuy,
    closeModal,
    selectPaymentMethod,
    selectedMethod,
  };
};
