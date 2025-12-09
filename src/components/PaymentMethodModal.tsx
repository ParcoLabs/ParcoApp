import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PaymentMethod } from '../hooks/useBuyFlow';

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethods: PaymentMethod[];
  vaultBalance: number;
  selectedMethod: PaymentMethod | null;
  onSelectMethod: (method: PaymentMethod) => void;
  onConfirm: () => void;
  propertyName?: string;
  tokenAmount?: number;
  tokenPrice?: number;
}

export const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({
  isOpen,
  onClose,
  paymentMethods,
  vaultBalance,
  selectedMethod,
  onSelectMethod,
  onConfirm,
  propertyName,
  tokenAmount = 1,
  tokenPrice = 0,
}) => {
  const navigate = useNavigate();
  const totalAmount = tokenAmount * tokenPrice;

  if (!isOpen) return null;

  const vaultMethod = paymentMethods.find(m => m.type === 'vault');
  const cardMethods = paymentMethods.filter(m => m.type === 'card');
  const bankMethods = paymentMethods.filter(m => m.type === 'bank');
  const cryptoMethods = paymentMethods.filter(m => m.type === 'crypto');

  const hasInsufficientVaultBalance = vaultBalance < totalAmount;

  const renderPaymentOption = (method: PaymentMethod, label: React.ReactNode, sublabel?: string, disabled?: boolean) => (
    <button
      key={method.id}
      onClick={() => !disabled && onSelectMethod(method)}
      disabled={disabled}
      className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
        selectedMethod?.id === method.id
          ? 'border-brand-deep bg-brand-mint/20'
          : disabled
            ? 'border-brand-lightGray bg-gray-50 opacity-50 cursor-not-allowed'
            : 'border-brand-lightGray hover:border-brand-medium hover:bg-brand-offWhite'
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-brand-offWhite flex items-center justify-center flex-shrink-0">
        {method.type === 'vault' && <i className="fa-solid fa-wallet text-brand-deep"></i>}
        {method.type === 'card' && <i className="fa-solid fa-credit-card text-brand-deep"></i>}
        {method.type === 'bank' && <i className="fa-solid fa-building-columns text-brand-deep"></i>}
        {method.type === 'crypto' && <i className="fa-brands fa-bitcoin text-brand-deep"></i>}
      </div>
      <div className="flex-1">
        <p className="font-bold text-brand-dark text-sm">{label}</p>
        {sublabel && <p className="text-xs text-brand-sage">{sublabel}</p>}
      </div>
      {selectedMethod?.id === method.id && (
        <i className="fa-solid fa-circle-check text-brand-deep text-xl"></i>
      )}
    </button>
  );

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-[200]"
        onClick={onClose}
      />

      <div className="hidden md:block fixed inset-0 z-[201] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="p-6 border-b border-brand-lightGray">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-brand-dark">Select Payment Method</h2>
              <button onClick={onClose} className="text-brand-sage hover:text-brand-dark p-2">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            {propertyName && (
              <p className="text-sm text-brand-sage mt-1">
                Purchasing {tokenAmount} token{tokenAmount > 1 ? 's' : ''} of {propertyName}
              </p>
            )}
          </div>

          <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
            {vaultMethod && renderPaymentOption(
              vaultMethod,
              'Parco Vault',
              `Balance: $${vaultBalance.toFixed(2)} USDC${hasInsufficientVaultBalance ? ' (Insufficient)' : ''}`,
              hasInsufficientVaultBalance
            )}

            {cardMethods.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-brand-sage uppercase tracking-wide">Cards</p>
                {cardMethods.map(card => renderPaymentOption(
                  card,
                  `${card.brand} •••• ${card.last4}`,
                  `Expires ${card.expMonth}/${card.expYear}`
                ))}
              </div>
            )}

            {bankMethods.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-brand-sage uppercase tracking-wide">Bank Accounts</p>
                {bankMethods.map(bank => renderPaymentOption(
                  bank,
                  bank.bankName || 'Bank Account',
                  `•••• ${bank.last4}`
                ))}
              </div>
            )}

            {cryptoMethods.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-brand-sage uppercase tracking-wide">Crypto Wallets</p>
                {cryptoMethods.map(crypto => {
                  const hasInsufficientBalance = (crypto.balance || 0) < totalAmount;
                  return renderPaymentOption(
                    crypto,
                    crypto.brand || 'Crypto',
                    `Balance: $${(crypto.balance || 0).toLocaleString()}${hasInsufficientBalance ? ' (Insufficient)' : ''}`,
                    hasInsufficientBalance
                  );
                })}
              </div>
            )}

            <button
              onClick={() => {
                onClose();
                navigate('/settings/payment-methods');
              }}
              className="w-full p-4 rounded-xl border-2 border-dashed border-brand-lightGray hover:border-brand-medium hover:bg-brand-offWhite transition-all text-center"
            >
              <i className="fa-solid fa-plus text-brand-sage mr-2"></i>
              <span className="text-brand-sage font-medium">Add Payment Method</span>
            </button>
          </div>

          <div className="p-6 border-t border-brand-lightGray bg-brand-offWhite">
            <div className="flex justify-between items-center mb-4">
              <span className="text-brand-sage font-medium">Total</span>
              <span className="text-xl font-bold text-brand-dark">${totalAmount.toFixed(2)}</span>
            </div>
            <button
              onClick={onConfirm}
              disabled={!selectedMethod}
              className={`w-full py-3.5 rounded-xl font-bold text-white transition-all ${
                selectedMethod
                  ? 'bg-brand-deep hover:bg-brand-dark shadow-md'
                  : 'bg-brand-sage cursor-not-allowed'
              }`}
            >
              {selectedMethod ? 'Continue to Purchase' : 'Select a Payment Method'}
            </button>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed inset-x-0 bottom-0 z-[201] bg-white rounded-t-3xl shadow-xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-brand-lightGray rounded-full mx-auto mt-3"></div>
        
        <div className="p-6 border-b border-brand-lightGray">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-brand-dark">Select Payment Method</h2>
            <button onClick={onClose} className="text-brand-sage hover:text-brand-dark p-2">
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>
          {propertyName && (
            <p className="text-sm text-brand-sage mt-1">
              {tokenAmount} token{tokenAmount > 1 ? 's' : ''} • ${totalAmount.toFixed(2)}
            </p>
          )}
        </div>

        <div className="p-4 space-y-3 max-h-[45vh] overflow-y-auto">
          {vaultMethod && renderPaymentOption(
            vaultMethod,
            'Parco Vault',
            `$${vaultBalance.toFixed(2)} USDC${hasInsufficientVaultBalance ? ' - Insufficient' : ''}`,
            hasInsufficientVaultBalance
          )}

          {cardMethods.map(card => renderPaymentOption(
            card,
            `${card.brand} •••• ${card.last4}`,
            `Exp ${card.expMonth}/${card.expYear}`
          ))}

          {bankMethods.map(bank => renderPaymentOption(
            bank,
            bank.bankName || 'Bank Account',
            `•••• ${bank.last4}`
          ))}

          {cryptoMethods.length > 0 && cryptoMethods.map(crypto => {
            const hasInsufficientBalance = (crypto.balance || 0) < totalAmount;
            return renderPaymentOption(
              crypto,
              crypto.brand || 'Crypto',
              `$${(crypto.balance || 0).toLocaleString()}${hasInsufficientBalance ? ' - Insufficient' : ''}`,
              hasInsufficientBalance
            );
          })}

          <button
            onClick={() => {
              onClose();
              navigate('/settings/payment-methods');
            }}
            className="w-full p-3 rounded-xl border-2 border-dashed border-brand-lightGray text-center"
          >
            <i className="fa-solid fa-plus text-brand-sage mr-2"></i>
            <span className="text-brand-sage font-medium text-sm">Add Payment Method</span>
          </button>
        </div>

        <div className="p-4 pb-8 border-t border-brand-lightGray bg-white">
          <button
            onClick={onConfirm}
            disabled={!selectedMethod}
            className={`w-full py-3.5 rounded-xl font-bold text-white transition-all ${
              selectedMethod
                ? 'bg-brand-deep hover:bg-brand-dark shadow-md'
                : 'bg-brand-sage cursor-not-allowed'
            }`}
          >
            {selectedMethod ? 'Continue' : 'Select Payment Method'}
          </button>
        </div>
      </div>
    </>
  );
};
