import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useKycGating } from '../hooks/useSumsubKyc';

interface KycGatedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const KycGatedButton: React.FC<KycGatedButtonProps> = ({
  children,
  onClick,
  className = '',
  disabled = false,
}) => {
  const navigate = useNavigate();
  const { canTrade, kycRequired, loading } = useKycGating();

  const handleClick = () => {
    if (kycRequired) {
      navigate('/kyc');
    } else if (onClick) {
      onClick();
    }
  };

  if (loading) {
    return (
      <button
        disabled
        className={`${className} opacity-50 cursor-not-allowed`}
      >
        <i className="fa-solid fa-spinner fa-spin mr-2"></i>
        Loading...
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={className}
    >
      {kycRequired ? (
        <>
          <i className="fa-solid fa-lock mr-2"></i>
          Complete KYC to Buy
        </>
      ) : (
        children
      )}
    </button>
  );
};

interface KycStatusBadgeProps {
  className?: string;
}

export const KycStatusBadge: React.FC<KycStatusBadgeProps> = ({ className = '' }) => {
  const { canTrade, kycRequired, loading } = useKycGating();
  const navigate = useNavigate();

  if (loading) {
    return null;
  }

  if (canTrade) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full ${className}`}>
        <i className="fa-solid fa-check-circle"></i>
        Verified
      </span>
    );
  }

  return (
    <button
      onClick={() => navigate('/kyc')}
      className={`inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full hover:bg-yellow-200 transition-colors ${className}`}
    >
      <i className="fa-solid fa-exclamation-triangle"></i>
      Complete KYC
    </button>
  );
};
