import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '../context/AuthContext';

interface PaymentMethod {
  id: string;
  type: 'CARD' | 'US_BANK_ACCOUNT';
  isDefault: boolean;
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  bankName?: string;
  bankLast4?: string;
  bankAccountType?: string;
  bankStatus?: string;
  nickname?: string;
}

const AddCardForm: React.FC<{ onSuccess: () => void; onCancel: () => void }> = ({ onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/setup-intent', {
        method: 'POST',
        credentials: 'include',
      });
      const { clientSecret } = await response.json();

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      const { setupIntent, error: stripeError } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (setupIntent?.payment_method) {
        await fetch('/api/payments/save-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ paymentMethodId: setupIntent.payment_method }),
        });
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-brand-lightGray p-6 shadow-sm">
      <h3 className="text-lg font-bold text-brand-dark mb-4">Add New Card</h3>
      <div className="border border-brand-lightGray rounded-xl p-4 mb-4">
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#1a1a1a',
              '::placeholder': { color: '#9ca3af' },
            },
          },
        }} />
      </div>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 border border-brand-lightGray rounded-xl font-semibold text-brand-dark hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !stripe}
          className="flex-1 py-3 bg-brand-green text-white rounded-xl font-semibold hover:bg-brand-deep disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Card'}
        </button>
      </div>
    </form>
  );
};

const PaymentMethodCard: React.FC<{
  method: PaymentMethod;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ method, onSetDefault, onDelete }) => {
  const getCardIcon = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa': return 'fa-brands fa-cc-visa';
      case 'mastercard': return 'fa-brands fa-cc-mastercard';
      case 'amex': return 'fa-brands fa-cc-amex';
      case 'discover': return 'fa-brands fa-cc-discover';
      default: return 'fa-solid fa-credit-card';
    }
  };

  return (
    <div className={`bg-white rounded-2xl border ${method.isDefault ? 'border-brand-green' : 'border-brand-lightGray'} p-4 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {method.type === 'CARD' ? (
            <i className={`${getCardIcon(method.cardBrand)} text-3xl text-brand-dark`}></i>
          ) : (
            <i className="fa-solid fa-building-columns text-3xl text-brand-dark dark:text-white"></i>
          )}
          <div>
            {method.type === 'CARD' ? (
              <>
                <p className="font-semibold text-brand-dark capitalize">
                  {method.cardBrand || 'Card'} •••• {method.cardLast4}
                </p>
                <p className="text-sm text-brand-sage">
                  Expires {method.cardExpMonth?.toString().padStart(2, '0')}/{method.cardExpYear?.toString().slice(-2)}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-brand-dark dark:text-white">
                  {method.bankName || 'Bank Account'} •••• {method.bankLast4}
                </p>
                <p className="text-sm text-brand-sage capitalize">
                  {method.bankAccountType || 'Checking'} • {method.bankStatus === 'VERIFIED' ? 'Verified' : 'Pending'}
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {method.isDefault ? (
            <span className="px-3 py-1 bg-brand-green/10 text-brand-green text-sm font-medium rounded-full">
              Default
            </span>
          ) : (
            <button
              onClick={() => onSetDefault(method.id)}
              className="px-3 py-1 text-sm text-brand-sage hover:text-brand-dark transition-colors"
            >
              Set Default
            </button>
          )}
          <button
            onClick={() => onDelete(method.id)}
            className="p-2 text-red-400 hover:text-red-600 transition-colors"
          >
            <i className="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

const PaymentMethodsContent: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [linkingBank, setLinkingBank] = useState(false);

  const fetchMethods = async () => {
    try {
      const response = await fetch('/api/payments/methods', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setMethods(data.data);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchMethods();
    }
  }, [isAuthenticated]);

  const handleSetDefault = async (id: string) => {
    try {
      await fetch('/api/payments/set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paymentMethodId: id }),
      });
      fetchMethods();
    } catch (error) {
      console.error('Error setting default:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return;
    try {
      await fetch(`/api/payments/methods/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      fetchMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
    }
  };

  const handleLinkBank = async () => {
    setLinkingBank(true);
    try {
      const configResponse = await fetch('/api/payments/config');
      const configData = await configResponse.json();
      
      if (!configData.success || !configData.publishableKey) {
        throw new Error('Could not load Stripe configuration');
      }

      const response = await fetch('/api/payments/financial-connections/session', {
        method: 'POST',
        credentials: 'include',
      });
      const { clientSecret, error: sessionError } = await response.json();

      if (sessionError) {
        throw new Error(sessionError);
      }

      const stripe = await loadStripe(configData.publishableKey);

      if (!stripe) throw new Error('Stripe not loaded');

      const { financialConnectionsSession, error } = await stripe.collectFinancialConnectionsAccounts({
        clientSecret,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (financialConnectionsSession?.accounts?.[0]) {
        const accountId = financialConnectionsSession.accounts[0].id;
        await fetch('/api/payments/link-bank-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ accountId }),
        });
        fetchMethods();
      }
    } catch (error: any) {
      console.error('Error linking bank:', error);
      alert(error.message || 'Failed to link bank account');
    } finally {
      setLinkingBank(false);
    }
  };

  const cards = methods.filter(m => m.type === 'CARD');
  const bankAccounts = methods.filter(m => m.type === 'US_BANK_ACCOUNT');

  return (
    <div className="min-h-screen bg-brand-offWhite p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center relative mb-8">
          <button onClick={() => navigate(-1)} className="absolute left-0 text-brand-dark dark:text-white">
            <i className="fa-solid fa-arrow-left text-xl"></i>
          </button>
          <h1 className="text-lg font-bold text-brand-dark dark:text-white">Payment Methods</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green"></div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-brand-dark text-lg">Cards</h2>
                {!showAddCard && (
                  <button
                    onClick={() => setShowAddCard(true)}
                    className="text-brand-green font-semibold text-sm hover:text-brand-deep dark:text-brand-mint"
                  >
                    <i className="fa-solid fa-plus mr-1"></i> Add Card
                  </button>
                )}
              </div>
              
              {showAddCard && (
                <div className="mb-4">
                  <AddCardForm
                    onSuccess={() => {
                      setShowAddCard(false);
                      fetchMethods();
                    }}
                    onCancel={() => setShowAddCard(false)}
                  />
                </div>
              )}

              {cards.length === 0 && !showAddCard ? (
                <div className="bg-white rounded-2xl border border-brand-lightGray p-8 text-center shadow-sm">
                  <i className="fa-solid fa-credit-card text-4xl text-brand-sage mb-3"></i>
                  <p className="text-brand-sage">No cards added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cards.map(method => (
                    <PaymentMethodCard
                      key={method.id}
                      method={method}
                      onSetDefault={handleSetDefault}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-brand-dark text-lg">Bank Accounts</h2>
                <button
                  onClick={handleLinkBank}
                  disabled={linkingBank}
                  className="text-brand-green font-semibold text-sm hover:text-brand-deep disabled:opacity-50"
                >
                  {linkingBank ? (
                    <span><i className="fa-solid fa-spinner fa-spin mr-1"></i> Linking...</span>
                  ) : (
                    <span><i className="fa-solid fa-plus mr-1"></i> Link Bank</span>
                  )}
                </button>
              </div>

              {bankAccounts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-brand-lightGray p-8 text-center shadow-sm">
                  <i className="fa-solid fa-building-columns text-4xl text-brand-sage mb-3"></i>
                  <p className="text-brand-sage mb-2">No bank accounts linked</p>
                  <p className="text-sm text-brand-sage/70">Link a bank account for ACH deposits with lower fees</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bankAccounts.map(method => (
                    <PaymentMethodCard
                      key={method.id}
                      method={method}
                      onSetDefault={handleSetDefault}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="bg-brand-green/5 rounded-2xl p-6 border border-brand-green/20">
              <h3 className="font-semibold text-brand-dark mb-2">
                <i className="fa-solid fa-shield-check text-brand-green mr-2"></i>
                Secure Payments
              </h3>
              <p className="text-sm text-brand-sage">
                Your payment information is securely stored and processed by Stripe. 
                We never store your full card details on our servers.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const PaymentMethods: React.FC = () => {
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  useEffect(() => {
    const fetchStripeKey = async () => {
      try {
        const response = await fetch('/api/payments/config');
        const data = await response.json();
        if (data.success && data.publishableKey) {
          setStripePromise(loadStripe(data.publishableKey));
        }
      } catch (error) {
        console.error('Error fetching Stripe config:', error);
      }
    };
    fetchStripeKey();
  }, []);

  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-brand-offWhite flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green"></div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentMethodsContent />
    </Elements>
  );
};
