
import React from 'react';
import { 
  BorrowStatsCard, 
  BorrowPropertyList, 
  LendPoolCard, 
  StakeComingSoonCard, 
  BorrowModal,
  LendModal 
} from '../../components/defi/DefiComponents';
import { DEFI_STATS, BORROW_PROPERTIES, LEND_POOLS } from '../../api/defiMockData';

interface DefiMobileProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onBorrow: (prop: any) => void;
  onLend: (pool: any) => void;
  borrowModalOpen: boolean;
  lendModalOpen: boolean;
  selectedProperty: any;
  selectedPool: any;
  closeModals: () => void;
}

export const DefiMobile: React.FC<DefiMobileProps> = ({ 
  activeTab, setActiveTab, onBorrow, onLend, 
  borrowModalOpen, lendModalOpen, selectedProperty, selectedPool, closeModals 
}) => {
  return (
    <div className="pb-24 pt-14">
      {/* Mobile Header */}
      <div className="p-6 bg-white border-b border-brand-lightGray sticky top-14 z-10">
        <h1 className="text-2xl font-bold text-brand-dark">DeFi</h1>
        <p className="text-brand-sage text-sm mt-1">Borrow, Lend, and Earn</p>
        
        <div className="flex gap-6 mt-6 border-b border-brand-lightGray">
            {['Borrow', 'Lend', 'Stake'].map(tab => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-sm font-bold transition-colors relative ${
                        activeTab === tab 
                        ? 'text-brand-deep border-b-2 border-brand-deep -mb-[1px]' 
                        : 'text-brand-sage'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {activeTab === 'Borrow' && (
            <>
                <BorrowStatsCard stats={DEFI_STATS} />
                <h3 className="font-bold text-brand-dark text-sm uppercase tracking-wide px-1">Borrow against assets</h3>
                <div className="space-y-4">
                    {BORROW_PROPERTIES.map(prop => (
                        <div key={prop.id} className="bg-white border border-brand-lightGray rounded-xl p-4 flex gap-4 items-center">
                            <img src={prop.image} className="w-16 h-16 rounded-lg object-cover bg-brand-lightGray" />
                            <div className="flex-1">
                                <h4 className="font-bold text-brand-dark">{prop.title}</h4>
                                <p className="text-xs text-brand-sage mb-2">Max Borrow: ${prop.maxBorrow}</p>
                                <button 
                                    onClick={() => onBorrow(prop)}
                                    className="bg-brand-deep text-white text-xs font-bold py-2 px-4 rounded-full w-full"
                                >
                                    Borrow
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        )}

        {activeTab === 'Lend' && (
            <div className="space-y-4">
                {LEND_POOLS.map(pool => (
                    <LendPoolCard key={pool.id} pool={pool} onAddLiquidity={onLend} />
                ))}
            </div>
        )}

        {activeTab === 'Stake' && (
            <StakeComingSoonCard />
        )}
      </div>

      {/* Modals */}
      <BorrowModal isOpen={borrowModalOpen} onClose={closeModals} property={selectedProperty} />
      <LendModal isOpen={lendModalOpen} onClose={closeModals} pool={selectedPool} />
    </div>
  );
};
