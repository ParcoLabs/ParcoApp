import React from 'react';
import { Outlet } from 'react-router-dom';
import { TokenizerNavigation } from '../../components/TokenizerNavigation';

export const TokenizerLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-brand-offWhite">
      <TokenizerNavigation />
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 overflow-y-auto h-screen">
        {children || <Outlet />}
      </main>
    </div>
  );
};
