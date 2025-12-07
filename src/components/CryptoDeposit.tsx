import React, { useState, useEffect } from 'react';

interface CryptoConfig {
  configured: boolean;
  supportedCurrencies: string[];
}

interface CryptoCharge {
  chargeId: string;
  chargeCode: string;
  hostedUrl: string;
  expiresAt: string;
  addresses: Record<string, string>;
  pricing: Record<string, { amount: string; currency: string }>;
}

interface CryptoDepositProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const CryptoDeposit: React.FC<CryptoDepositProps> = ({ onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<CryptoConfig | null>(null);
  const [charge, setCharge] = useState<CryptoCharge | null>(null);

  useEffect(() => {
    fetchConfig();
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
        body: JSON.stringify({
          amount: parseFloat(amount),
          description: `Deposit $${amount} to Parco vault`,
        }),
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

  const getCryptoIcon = (currency: string) => {
    switch (currency.toUpperCase()) {
      case 'BTC':
        return 'fa-brands fa-bitcoin';
      case 'ETH':
        return 'fa-brands fa-ethereum';
      case 'USDC':
      case 'USDT':
      case 'DAI':
        return 'fa-solid fa-dollar-sign';
      case 'SOL':
        return 'fa-solid fa-sun';
      default:
        return 'fa-solid fa-coins';
    }
  };

  if (!config?.configured) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
          <div className="text-center">
            <i className="fa-solid fa-triangle-exclamation text-4xl text-yellow-500 mb-4"></i>
            <h2 className="text-xl font-bold text-brand-dark mb-2">Crypto Payments Not Available</h2>
            <p className="text-brand-sage mb-6">
              Crypto payment processing is not configured yet. Please contact support or try another payment method.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-brand-green text-white rounded-xl font-semibold hover:bg-brand-deep transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-brand-dark">Deposit with Crypto</h2>
          <button onClick={onClose} className="text-brand-sage hover:text-brand-dark">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        {!charge ? (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-brand-dark mb-2">
                Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-sage">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="10"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-3 border border-brand-lightGray rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green/50 text-lg"
                />
              </div>
              <p className="text-xs text-brand-sage mt-2">Minimum deposit: $10</p>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-brand-dark mb-3">Supported Cryptocurrencies</p>
              <div className="flex flex-wrap gap-2">
                {config.supportedCurrencies.map((currency) => (
                  <div
                    key={currency}
                    className="flex items-center gap-2 px-3 py-2 bg-brand-offWhite rounded-lg"
                  >
                    <i className={`${getCryptoIcon(currency)} text-brand-dark`}></i>
                    <span className="text-sm font-medium text-brand-dark">{currency}</span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleCreateCharge}
              disabled={loading || !amount}
              className="w-full py-3 bg-brand-green text-white rounded-xl font-semibold hover:bg-brand-deep transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Creating Payment...
                </span>
              ) : (
                'Continue to Payment'
              )}
            </button>

            <div className="mt-6 p-4 bg-brand-offWhite rounded-xl">
              <h4 className="font-semibold text-brand-dark text-sm mb-2">
                <i className="fa-solid fa-info-circle text-brand-green mr-2"></i>
                How it works
              </h4>
              <ol className="text-xs text-brand-sage space-y-1 list-decimal list-inside">
                <li>Enter the USD amount you want to deposit</li>
                <li>Choose your preferred cryptocurrency</li>
                <li>Send crypto to the provided address</li>
                <li>Your USDC balance updates once confirmed</li>
              </ol>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-check text-3xl text-brand-green"></i>
              </div>
              <h3 className="text-lg font-bold text-brand-dark mb-2">Payment Created</h3>
              <p className="text-brand-sage text-sm">
                Click below to complete your ${amount} deposit using cryptocurrency.
              </p>
            </div>

            <div className="mb-6 p-4 bg-brand-offWhite rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-brand-sage">Amount</span>
                <span className="font-semibold text-brand-dark">${amount}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-brand-sage">Code</span>
                <span className="font-mono text-sm text-brand-dark">{charge.chargeCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-brand-sage">Expires</span>
                <span className="text-sm text-brand-dark">
                  {new Date(charge.expiresAt).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <button
              onClick={handleOpenPayment}
              className="w-full py-3 bg-brand-green text-white rounded-xl font-semibold hover:bg-brand-deep transition-colors mb-3"
            >
              <i className="fa-solid fa-external-link mr-2"></i>
              Open Coinbase Commerce
            </button>

            <button
              onClick={() => {
                setCharge(null);
                setAmount('');
                onSuccess?.();
              }}
              className="w-full py-3 border border-brand-lightGray text-brand-dark rounded-xl font-semibold hover:bg-brand-offWhite transition-colors"
            >
              Create Another Deposit
            </button>

            <p className="text-xs text-brand-sage text-center mt-4">
              Your balance will update automatically once the payment is confirmed on the blockchain.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
