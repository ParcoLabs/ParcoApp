import { useState, useCallback, useEffect, useRef } from 'react';

interface KycStatus {
  status: 'NOT_STARTED' | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  level: 'NONE' | 'BASIC' | 'VERIFIED' | 'ACCREDITED';
  reviewStatus?: string;
  reviewResult?: any;
  canTrade: boolean;
}

interface SumsubConfig {
  configured: boolean;
  levelName: string;
}

export function useSumsubKyc() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [config, setConfig] = useState<SumsubConfig | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/kyc/config');
      const data = await response.json();
      if (data.success) {
        setConfig(data);
      }
    } catch (err) {
      console.error('Error fetching KYC config:', err);
    }
  }, []);

  const fetchStatus = useCallback(async (): Promise<KycStatus | null> => {
    try {
      const response = await fetch('/api/kyc/sumsub/status', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setKycStatus(data);
        return data;
      }
      return null;
    } catch (err) {
      console.error('Error fetching KYC status:', err);
      return null;
    }
  }, []);

  const initSumsub = useCallback(async (): Promise<string | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/kyc/sumsub/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.success && data.token) {
        setToken(data.token);
        return data.token;
      } else {
        setError(data.error || 'Failed to initialize KYC');
        return null;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize KYC');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('/api/kyc/sumsub/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.success && data.token) {
        setToken(data.token);
        return data.token;
      }
      throw new Error(data.error || 'Failed to refresh token');
    } catch (err: any) {
      console.error('Error refreshing token:', err);
      throw err;
    }
  }, []);

  const startPolling = useCallback((onStatusChange?: (status: KycStatus) => void) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    setIsPolling(true);
    
    const poll = async () => {
      const status = await fetchStatus();
      if (status && onStatusChange) {
        onStatusChange(status);
      }
      
      if (status?.status === 'APPROVED' || status?.status === 'REJECTED') {
        stopPolling();
      }
    };
    
    poll();
    pollingRef.current = setInterval(poll, 3000);
  }, [fetchStatus]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchStatus();
    
    return () => {
      stopPolling();
    };
  }, [fetchConfig, fetchStatus, stopPolling]);

  return {
    token,
    loading,
    error,
    kycStatus,
    config,
    isPolling,
    initSumsub,
    refreshToken,
    fetchStatus,
    startPolling,
    stopPolling,
  };
}

export function useKycGating() {
  const [canTrade, setCanTrade] = useState(false);
  const [kycRequired, setKycRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkKycStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/kyc/sumsub/status', {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        setCanTrade(data.canTrade || false);
        setKycRequired(data.status !== 'APPROVED');
      }
    } catch (err) {
      console.error('Error checking KYC status:', err);
      setCanTrade(false);
      setKycRequired(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkKycStatus();
  }, [checkKycStatus]);

  return {
    canTrade,
    kycRequired,
    loading,
    checkKycStatus,
  };
}
