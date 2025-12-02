import React, { useState, useEffect } from 'react';

interface CryptoConfig {
  enabled: boolean;
  supportedCurrencies: string[];
}

interface CryptoCharge {
  chargeId: string;
  chargeCode: string;
  hostedUrl: string;
  expiresAt: string;
  addresses?: Record<string, string>;
  pricing?: Record<string, { amount: string; currency: string }>;
}

interface CryptoPaymentHistory {
  id: string;
  chargeId: string;
  chargeCode: string;
  status: string;
  requestedAmount: string;
  requestedCurrency: string;
  receivedAmount: string | null;
  receivedCurrency: string | null;
  usdcEquivalent: string | null;
  expiresAt: string;
  confirmedAt: string | null;
  createdAt: string;
}

const getCurrencyIcon = (currency: string) => {
  switch (currency.toUpperCase()) {
    case 'BTC':
      return 'fa-brands fa-bitcoin';
    case 'ETH':
      return 'fa-brands fa-ethereum';
    case 'SOL':
      return 'fa-solid fa-sun';
    case 'USDC':
    case 'USDT':
    case 'DAI':
      return 'fa-solid fa-dollar-sign';
    default:
      return 'fa-solid fa-coins';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'CONFIRMED':
    case 'RESOLVED':
      return 'text-green-500 bg-green-100';
    case 'PENDING':
      return 'text-yellow-600 bg-yellow-100';
    case 'FAILED':
    case 'EXPIRED':
      return 'text-red-500 bg-red-100';
    default:
      return 'text-gray-500 bg-gray-100';
  }
};

export const CryptoDeposit: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [config, setConfig] = useState<CryptoConfig | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [charge, setCharge] = useState<CryptoCharge | null>(null);
  const [history, setHistory] = useState<CryptoPaymentHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
    fetchHistory();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/crypto/config');
      const data = await response.json();
      if (data.success) {
        setConfig(data);
      }
    } catch (err) {
      console.error('Error fetching crypto config:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/crypto/payments', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setHistory(data.data);
      }
    } catch (err) {
      console.error('Error fetching crypto history:', err);
    }
  };

  const handleCreateCharge = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/crypto/create-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (data.success) {
        setCharge(data.data);
      } else {
        setError(data.error || 'Failed to create payment');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayment = () => {
    if (charge?.hostedUrl) {
      window.open(charge.hostedUrl, '_blank');
    }
  };

  if (!config?.enabled) {
    return (
      <div className="bg-white rounded-2xl border border-brand-lightGray p-6 shadow-sm">
        <div className="text-center py-8">
          <i className="fa-solid fa-coins text-4xl text-brand-sage mb-4"></i>
          <p className="text-brand-sage">Crypto payments are not configured</p>
          <p className="text-sm text-brand-sage/70 mt-2">
            Contact support to enable cryptocurrency deposits
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-brand-lightGray shadow-sm">
      <div className="p-6 border-b border-brand-lightGray">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-dark flex items-center gap-2">
            <i className="fa-brands fa-bitcoin text-orange-500"></i>
            Crypto Deposit
          </h2>
          {onClose && (
            <button onClick={onClose} className="text-brand-sage hover:text-brand-dark">
              <i className="fa-solid fa-times"></i>
            </button>
          )}
        </div>
        <p className="text-sm text-brand-sage mt-1">
          Deposit BTC, ETH, SOL, or USDC to fund your vault
        </p>
      </div>

      <div className="p-6">
        {charge ? (
          <div className="space-y-4">
            <div className="bg-brand-green/10 rounded-xl p-4 border border-brand-green/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-brand-green rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-check text-white"></i>
                </div>
                <div>
                  <p className="font-semibold text-brand-dark">Payment Created</p>
                  <p className="text-sm text-brand-sage">Code: {charge.chargeCode}</p>
                </div>
              </div>

              <button
                onClick={handleOpenPayment}
                className="w-full py-3 bg-brand-green text-white rounded-xl font-semibold hover:bg-brand-deep transition-colors flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-external-link"></i>
                Pay with Crypto
              </button>

              <p className="text-xs text-brand-sage text-center mt-3">
                Expires: {new Date(charge.expiresAt).toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-brand-dark">Supported Currencies:</p>
              <div className="flex flex-wrap gap-2">
                {config.supportedCurrencies.map((currency) => (
                  <span
                    key={currency}
                    className="px-3 py-1 bg-brand-offWhite rounded-full text-sm text-brand-dark flex items-center gap-1"
                  >
                    <i className={getCurrencyIcon(currency)}></i>
                    {currency}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setCharge(null);
                setAmount('');
                fetchHistory();
              }}
              className="w-full py-3 border border-brand-lightGray rounded-xl font-semibold text-brand-dark hover:bg-gray-50"
            >
              Create New Payment
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-dark mb-2">
                Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-sage">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100.00"
                  min="1"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-3 border border-brand-lightGray rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              onClick={handleCreateCharge}
              disabled={loading || !amount}
              className="w-full py-3 bg-brand-green text-white rounded-xl font-semibold hover:bg-brand-deep transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Creating...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-coins"></i>
                  Create Crypto Payment
                </>
              )}
            </button>

            <div className="flex flex-wrap gap-2 justify-center">
              {config.supportedCurrencies.map((currency) => (
                <span
                  key={currency}
                  className="px-3 py-1 bg-brand-offWhite rounded-full text-xs text-brand-sage flex items-center gap-1"
                >
                  <i className={getCurrencyIcon(currency)}></i>
                  {currency}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="border-t border-brand-lightGray">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full p-4 flex items-center justify-between text-brand-dark hover:bg-gray-50"
          >
            <span className="font-medium">Recent Crypto Deposits</span>
            <i className={`fa-solid fa-chevron-${showHistory ? 'up' : 'down'}`}></i>
          </button>

          {showHistory && (
            <div className="px-4 pb-4 space-y-2">
              {history.slice(0, 5).map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-brand-offWhite rounded-xl"
                >
                  <div>
                    <p className="font-medium text-brand-dark">
                      ${parseFloat(payment.requestedAmount).toFixed(2)}
                    </p>
                    <p className="text-xs text-brand-sage">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      payment.status
                    )}`}
                  >
                    {payment.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-4 bg-brand-offWhite rounded-b-2xl">
        <div className="flex items-start gap-3">
          <i className="fa-solid fa-info-circle text-brand-sage mt-0.5"></i>
          <div className="text-xs text-brand-sage">
            <p className="mb-1">
              Crypto deposits are converted to USDC at the current market rate.
            </p>
            <p>
              Funds will be credited to your vault after blockchain confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
