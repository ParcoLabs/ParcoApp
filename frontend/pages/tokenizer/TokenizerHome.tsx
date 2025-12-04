import React from 'react';
import { TokenizerPreDashboard } from './TokenizerPreDashboard';
import { TokenizerPostDashboard } from './TokenizerPostDashboard';
import { useTokenizerContext } from './TokenizerLayout';

export const TokenizerHome: React.FC = () => {
  const { viewMode } = useTokenizerContext();

  return viewMode === 'pre' ? <TokenizerPreDashboard /> : <TokenizerPostDashboard />;
};
