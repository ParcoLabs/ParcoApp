
import React, { useState } from 'react';
import { DefiMobile } from '../../mobile/defi/DefiMobile';
import { 
  BorrowStatsCard, 
  BorrowPropertyList, 
  LendPoolCard, 
  StakeComingSoonCard, 
  BorrowModal,
  LendModal 
} from '../../components/defi/DefiComponents';
import { DEFI_STATS, BORROW_PROPERTIES, LEND_POOLS } from '../../api/defiMockData';

export const DefiPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Borrow');
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [lendModalOpen, setLendModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [selectedPool, setSelectedPool] = useState<any>(null);

  const handleBorrow = (property: any) => {
    setSelectedProperty(property);
    setBorrowModalOpen(true);
  };

  const handleLend = (pool: any) => {
    setSelectedPool(pool);
    setLendModalOpen(true);
  };

  const closeModals = () => {
    setBorrowModalOpen(false);
    setLendModalOpen(false);
    setSelectedProperty(null);
    setSelectedPool(null);
  };

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        <DefiMobile 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            onBorrow={handleBorrow}
            onLend={handleLend}
            borrowModalOpen={borrowModalOpen}
            lendModalOpen={lendModalOpen}
            selectedProperty={selectedProperty}
            selectedPool={selectedPool}
            closeModals={closeModals}
        />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-end border-b border-brand-lightGray pb-4">
            <div>
                <h1 className="text-3xl font-bold text-brand-dark mb-2">DeFi</h1>
                <p className="text-brand-sage">Borrow, Lend, and Earn using your property tokens</p>
            </div>
            <div className="flex gap-2 bg-brand-offWhite p-1 rounded-lg">
                {['Borrow', 'Lend', 'Stake'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2 rounded-md font-bold text-sm transition-all ${
                            activeTab === tab 
                            ? 'bg-white text-brand-deep shadow-sm' 
                            : 'text-brand-sage hover:text-brand-dark'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
        </div>

        {activeTab === 'Borrow' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <BorrowStatsCard stats={DEFI_STATS} />
                    <BorrowPropertyList properties={BORROW_PROPERTIES} onBorrow={handleBorrow} />
                </div>
                <div className="bg-brand-mint/20 border border-brand-mint rounded-2xl p-6 h-fit">
                    <h3 className="font-bold text-brand-dark mb-4"><i className="fa-solid fa-circle-info mr-2 text-brand-medium"></i>How it works</h3>
                    <ul className="space-y-4 text-sm text-brand-dark">
                        <li className="flex gap-3">
                            <span className="font-bold text-brand-medium">1.</span>
                            Lock your property tokens as collateral in the smart contract.
                        </li>
                        <li className="flex gap-3">
                            <span className="font-bold text-brand-medium">2.</span>
                            Receive USDC instantly up to 60% of your collateral value (LTV).
                        </li>
                        <li className="flex gap-3">
                            <span className="font-bold text-brand-medium">3.</span>
                            Repay at any time. Interest is calculated dynamically.
                        </li>
                    </ul>
                </div>
            </div>
        )}

        {activeTab === 'Lend' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {LEND_POOLS.map(pool => (
                    <LendPoolCard key={pool.id} pool={pool} onAddLiquidity={handleLend} />
                ))}
            </div>
        )}

        {activeTab === 'Stake' && (
            <div className="max-w-2xl mx-auto pt-12">
                <StakeComingSoonCard />
            </div>
        )}

        {/* Modals */}
        <BorrowModal isOpen={borrowModalOpen} onClose={closeModals} property={selectedProperty} />
        <LendModal isOpen={lendModalOpen} onClose={closeModals} pool={selectedPool} />
      </div>
    </>
  );
};
