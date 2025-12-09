
import React, { useState, useEffect } from 'react';
import { DefiMobile } from '../../mobile/defi/DefiMobile';
import { 
  BorrowStatsCard, 
  BorrowPropertyList, 
  LendPoolCard, 
  StakeComingSoonCard, 
  BorrowModal 
} from '../../components/defi/DefiComponents';
import { DEFI_STATS, BORROW_PROPERTIES, LEND_POOLS } from '../../api/defiMockData';
import { useDemoMode } from '../../context/DemoModeContext';
import { useDemo } from '../../hooks/useDemo';

interface LendingPool {
  id: string;
  name: string;
  apy: number;
  tvl: number;
  userDeposit: number;
  accruedYield: number;
}

interface BorrowableHolding {
  id: string;
  title: string;
  location: string;
  image: string;
  tokensOwned: number;
  lockedTokens: number;
  availableTokens: number;
  tokenPrice: number;
  maxLTV: number;
  isDemoHolding: boolean;
}

export const DefiPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Borrow');
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [lendModalOpen, setLendModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [selectedPool, setSelectedPool] = useState<LendingPool | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [lendingPools, setLendingPools] = useState<LendingPool[]>([]);
  const [borrowableHoldings, setBorrowableHoldings] = useState<BorrowableHolding[]>([]);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { demoMode } = useDemoMode();
  const { getLendingPools, depositToPool, withdrawFromPool, getBorrowableHoldings, demoBorrow, loading, error } = useDemo();

  useEffect(() => {
    console.log('[DefiPage] useEffect triggered, demoMode:', demoMode);
    if (demoMode) {
      loadLendingPools();
      loadBorrowableHoldings();
    }
  }, [demoMode]);

  const loadLendingPools = async () => {
    const pools = await getLendingPools();
    if (pools) {
      setLendingPools(pools);
    }
  };

  const loadBorrowableHoldings = async () => {
    console.log('[DefiPage] loadBorrowableHoldings called');
    const holdings = await getBorrowableHoldings();
    console.log('[DefiPage] borrowable holdings result:', holdings);
    if (holdings) {
      setBorrowableHoldings(holdings);
    }
  };

  const handleBorrow = (property: any) => {
    setSelectedProperty(property);
    setBorrowModalOpen(true);
  };

  const handleConfirmBorrow = async (propertyId: string, tokenAmount: number, borrowAmount: number, isDemoHolding: boolean) => {
    const result = await demoBorrow(propertyId, tokenAmount, borrowAmount, isDemoHolding);
    if (result) {
      setActionSuccess(`Borrowed $${(borrowAmount * 0.99).toFixed(2)} USDC!`);
      await loadBorrowableHoldings();
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const handleLend = (pool: any) => {
    setSelectedPool(pool);
    setDepositAmount('');
    setWithdrawAmount('');
    setLendModalOpen(true);
  };

  const handleDeposit = async () => {
    if (!selectedPool || !depositAmount || parseFloat(depositAmount) <= 0) return;
    
    const result = await depositToPool(selectedPool.id, parseFloat(depositAmount));
    if (result) {
      setActionSuccess(`Deposited $${depositAmount} to ${selectedPool.name}`);
      setDepositAmount('');
      await loadLendingPools();
      setTimeout(() => setActionSuccess(null), 3000);
      setLendModalOpen(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedPool || !withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
    
    const result = await withdrawFromPool(selectedPool.id, parseFloat(withdrawAmount));
    if (result) {
      setActionSuccess(`Withdrew $${withdrawAmount} from ${selectedPool.name}`);
      setWithdrawAmount('');
      await loadLendingPools();
      setTimeout(() => setActionSuccess(null), 3000);
      setLendModalOpen(false);
    }
  };

  const closeModals = () => {
    setBorrowModalOpen(false);
    setLendModalOpen(false);
    setSelectedProperty(null);
    setSelectedPool(null);
    setDepositAmount('');
    setWithdrawAmount('');
  };

  const poolsToDisplay = demoMode && lendingPools.length > 0 ? lendingPools : LEND_POOLS;

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
                    {demoMode && borrowableHoldings.length > 0 ? (
                      <div className="bg-white border border-brand-lightGray rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-brand-lightGray">
                          <h3 className="font-bold text-brand-dark">Your Property Tokens</h3>
                          <p className="text-sm text-brand-sage">Select a property to borrow against</p>
                        </div>
                        <div className="divide-y divide-brand-lightGray">
                          {borrowableHoldings.map((holding) => (
                            <div key={holding.id} className="p-4 flex items-center justify-between hover:bg-brand-offWhite/30 transition-colors">
                              <div className="flex items-center gap-4">
                                <img src={holding.image} alt={holding.title} className="w-12 h-12 rounded-lg object-cover bg-brand-lightGray" />
                                <div>
                                  <p className="font-bold text-brand-dark">{holding.title}</p>
                                  <p className="text-sm text-brand-sage">{holding.location}</p>
                                  <p className="text-xs text-brand-medium">
                                    {holding.availableTokens} tokens available (${(holding.availableTokens * holding.tokenPrice).toLocaleString()} value)
                                  </p>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleBorrow(holding)}
                                className="bg-brand-deep hover:bg-brand-dark text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                              >
                                Borrow
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : demoMode ? (
                      <div className="bg-white border border-brand-lightGray rounded-2xl p-8 text-center">
                        <i className="fa-solid fa-building text-4xl text-brand-lightGray mb-3"></i>
                        <p className="text-brand-sage font-bold">No property tokens to borrow against</p>
                        <p className="text-sm text-brand-sage">Purchase property tokens from the Marketplace first</p>
                      </div>
                    ) : (
                      <BorrowPropertyList properties={BORROW_PROPERTIES} onBorrow={handleBorrow} />
                    )}
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
            <>
              {demoMode && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                  <span className="text-sm text-amber-800">Demo Lending - Deposit USDC to earn yield</span>
                </div>
              )}
              {actionSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 flex items-center gap-2">
                  <i className="fa-solid fa-check-circle text-green-600"></i>
                  <span className="text-sm text-green-800">{actionSuccess}</span>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {poolsToDisplay.map(pool => (
                      <LendPoolCard key={pool.id} pool={pool} onAddLiquidity={handleLend} />
                  ))}
              </div>
            </>
        )}

        {activeTab === 'Stake' && (
            <div className="max-w-2xl mx-auto pt-12">
                <StakeComingSoonCard />
            </div>
        )}

        {/* Modals */}
        <BorrowModal 
          isOpen={borrowModalOpen} 
          onClose={closeModals} 
          property={selectedProperty}
          onConfirmBorrow={handleConfirmBorrow}
          loading={loading}
          error={error}
        />
        
        {/* Lend Modal */}
        {lendModalOpen && selectedPool && (
          <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-0">
            <div className="bg-white w-full max-w-md rounded-2xl md:rounded-3xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-brand-dark text-xl">
                  {selectedPool.userDeposit > 0 ? 'Manage Position' : 'Add Liquidity'}
                </h3>
                <button onClick={closeModals} className="text-brand-sage hover:text-brand-dark">
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
              </div>

              <div className="mb-6">
                <h4 className="font-bold text-brand-dark mb-1">{selectedPool.name}</h4>
                <p className="text-brand-medium font-bold text-2xl">
                  {selectedPool.apy}% <span className="text-sm font-medium text-brand-sage">APY</span>
                </p>
                <p className="text-sm text-brand-sage mt-1">
                  TVL: ${(selectedPool.tvl || 0).toLocaleString()}
                </p>
              </div>

              {selectedPool.userDeposit > 0 && (
                <div className="bg-brand-mint/20 border border-brand-mint rounded-xl p-4 mb-4">
                  <p className="text-sm text-brand-dark font-medium">Your Position</p>
                  <p className="text-xl font-bold text-brand-dark">${selectedPool.userDeposit.toLocaleString()}</p>
                  {selectedPool.accruedYield > 0 && (
                    <p className="text-sm text-brand-medium">+${selectedPool.accruedYield.toFixed(2)} accrued</p>
                  )}
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-bold text-brand-sage mb-2">Deposit Amount (USDC)</label>
                <input 
                  type="number" 
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-brand-lightGray focus:border-brand-deep focus:ring-1 focus:ring-brand-deep outline-none font-bold text-lg text-brand-dark"
                  placeholder="0.00"
                />
              </div>

              <button 
                onClick={handleDeposit}
                disabled={loading || !depositAmount || parseFloat(depositAmount) <= 0}
                className="w-full bg-brand-deep hover:bg-brand-dark text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-colors disabled:opacity-50 mb-3"
              >
                {loading ? 'Processing...' : 'Deposit'}
              </button>

              {selectedPool.userDeposit > 0 && (
                <>
                  <div className="border-t border-brand-lightGray my-4 pt-4">
                    <label className="block text-sm font-bold text-brand-sage mb-2">Withdraw Amount (USDC)</label>
                    <input 
                      type="number" 
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-brand-lightGray focus:border-brand-deep focus:ring-1 focus:ring-brand-deep outline-none font-bold text-lg text-brand-dark"
                      placeholder="0.00"
                    />
                    <p className="text-right text-xs text-brand-sage mt-2 font-bold cursor-pointer" onClick={() => setWithdrawAmount(selectedPool.userDeposit.toString())}>
                      Max: ${selectedPool.userDeposit.toLocaleString()}
                    </p>
                  </div>
                  <button 
                    onClick={handleWithdraw}
                    disabled={loading || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                    className="w-full border-2 border-brand-deep text-brand-deep hover:bg-brand-deep hover:text-white py-3.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Withdraw'}
                  </button>
                </>
              )}

              {error && (
                <p className="text-red-500 text-sm mt-3 text-center">{error}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
