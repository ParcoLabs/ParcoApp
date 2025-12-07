
import React, { useState } from 'react';

// --- STATS CARD ---
export const BorrowStatsCard: React.FC<{ stats: any }> = ({ stats }) => (
  <div className="bg-brand-deep rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
    {/* Background Pattern */}
    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-medium/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
    
    <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-6">
      <div>
        <p className="text-brand-lime/80 text-xs font-bold uppercase tracking-wider mb-1">Borrowing Power</p>
        <p className="text-2xl font-bold">${stats.borrowPower.toLocaleString()}</p>
      </div>
      <div>
        <p className="text-brand-lime/80 text-xs font-bold uppercase tracking-wider mb-1">Available</p>
        <p className="text-2xl font-bold">${stats.availableToBorrow.toLocaleString()}</p>
      </div>
      <div>
        <p className="text-brand-lime/80 text-xs font-bold uppercase tracking-wider mb-1">Current Debt</p>
        <p className="text-2xl font-bold">${stats.currentDebt.toLocaleString()}</p>
      </div>
      <div>
        <p className="text-brand-lime/80 text-xs font-bold uppercase tracking-wider mb-1">Interest (APR)</p>
        <p className="text-2xl font-bold text-brand-lime">{stats.apr}%</p>
      </div>
    </div>
  </div>
);

// --- PROPERTY LIST ---
export const BorrowPropertyList: React.FC<{ properties: any[], onBorrow: (prop: any) => void }> = ({ properties, onBorrow }) => (
  <div className="bg-white border border-brand-lightGray rounded-2xl overflow-hidden shadow-sm">
    <div className="p-4 border-b border-brand-lightGray bg-brand-offWhite/50">
        <h3 className="font-bold text-brand-dark text-sm uppercase tracking-wide">Your Collateral</h3>
    </div>
    <div className="divide-y divide-brand-lightGray">
      {properties.map((prop) => (
        <div key={prop.id} className="p-4 flex items-center justify-between hover:bg-brand-offWhite/30 transition-colors">
          <div className="flex items-center gap-4">
            <img src={prop.image} alt={prop.title} className="w-12 h-12 rounded-lg object-cover bg-brand-lightGray" />
            <div>
              <p className="font-bold text-brand-dark text-sm">{prop.title}</p>
              <p className="text-xs text-brand-sage font-medium">{prop.tokenCount} Tokens</p>
            </div>
          </div>
          <div className="text-right flex items-center gap-4">
            <div className="hidden md:block">
               <p className="text-[10px] text-brand-sage uppercase font-bold">Max Borrow</p>
               <p className="font-bold text-brand-dark text-sm">${prop.maxBorrow.toLocaleString()}</p>
            </div>
            <button 
              onClick={() => onBorrow(prop)}
              className="bg-white border border-brand-deep text-brand-deep hover:bg-brand-offWhite px-4 py-2 rounded-lg text-xs font-bold transition-colors"
            >
              Borrow
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// --- LEND POOL CARD ---
export const LendPoolCard: React.FC<{ pool: any, onAddLiquidity: (pool: any) => void }> = ({ pool, onAddLiquidity }) => (
  <div className="bg-white border border-brand-lightGray rounded-2xl p-5 hover:shadow-md transition-all">
    <div className="flex justify-between items-start mb-4">
        <div>
            <h3 className="font-bold text-brand-dark text-lg">{pool.name}</h3>
            <p className="text-brand-sage text-xs font-medium mt-1">TVL: ${(pool.tvl / 1000000).toFixed(1)}M</p>
        </div>
        <div className="text-right">
            <p className="text-brand-deep font-bold text-xl">{pool.apy}%</p>
            <p className="text-[10px] text-brand-sage uppercase font-bold">APY</p>
        </div>
    </div>
    
    {pool.userDeposit > 0 && (
        <div className="mb-4 bg-brand-mint/30 p-2 rounded-lg flex justify-between items-center border border-brand-mint/50">
            <span className="text-xs font-bold text-brand-deep">Your Position</span>
            <span className="text-xs font-bold text-brand-deep">${pool.userDeposit.toLocaleString()}</span>
        </div>
    )}

    <button 
      onClick={() => onAddLiquidity(pool)}
      className="w-full bg-brand-deep hover:bg-brand-dark text-white py-2.5 rounded-lg font-bold text-sm transition-colors"
    >
      Add Liquidity
    </button>
  </div>
);

// --- STAKE PLACEHOLDER ---
export const StakeComingSoonCard: React.FC = () => (
  <div className="bg-brand-offWhite border border-brand-lightGray rounded-2xl p-8 text-center opacity-75">
    <div className="w-16 h-16 bg-brand-lightGray rounded-full flex items-center justify-center mx-auto mb-4 text-brand-sage">
       <i className="fa-solid fa-layer-group text-2xl"></i>
    </div>
    <h3 className="font-bold text-brand-dark text-lg mb-2">Staking Coming Soon</h3>
    <p className="text-brand-sage text-sm max-w-xs mx-auto">
      Earn governance rights and additional yield by staking your property tokens in the Parco DAO.
    </p>
    <button disabled className="mt-6 bg-brand-lightGray text-brand-sage cursor-not-allowed px-6 py-2 rounded-lg font-bold text-sm">
        Notify Me
    </button>
  </div>
);

// --- BORROW MODAL ---
export const BorrowModal: React.FC<{ isOpen: boolean, onClose: () => void, property: any }> = ({ isOpen, onClose, property }) => {
  const [amount, setAmount] = useState<number>(0);
  if (!isOpen || !property) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-0">
      <div className="bg-white w-full max-w-md rounded-2xl md:rounded-3xl p-6 shadow-2xl animate-slide-up md:animate-fade-in">
        <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-brand-dark text-xl">Borrow USDC</h3>
            <button onClick={onClose} className="text-brand-sage hover:text-brand-dark"><i className="fa-solid fa-xmark text-xl"></i></button>
        </div>

        <div className="flex items-center gap-4 mb-6 p-3 bg-brand-offWhite rounded-xl border border-brand-lightGray">
            <img src={property.image} className="w-12 h-12 rounded-lg object-cover" />
            <div>
                <p className="font-bold text-brand-dark text-sm">{property.title}</p>
                <p className="text-xs text-brand-sage">Collateral Value: ${property.maxBorrow / (property.ltv/100)}</p>
            </div>
        </div>

        <div className="mb-8">
            <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-brand-sage">Amount</span>
                <span className="text-sm font-bold text-brand-deep">Max: ${property.maxBorrow}</span>
            </div>
            <div className="relative">
                <span className="absolute left-4 top-3.5 text-brand-dark font-bold text-lg">$</span>
                <input 
                    type="number" 
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-brand-lightGray focus:border-brand-deep focus:ring-1 focus:ring-brand-deep outline-none font-bold text-lg text-brand-dark"
                    placeholder="0.00"
                    onChange={(e) => setAmount(Number(e.target.value))}
                />
            </div>
            <input 
                type="range" 
                min="0" 
                max={property.maxBorrow} 
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full mt-4 accent-brand-deep h-1 bg-brand-lightGray rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between mt-2 text-xs font-bold">
                <span className="text-brand-sage">LTV: {((amount / (property.maxBorrow / 0.6)) * 100).toFixed(1)}%</span>
                <span className="text-brand-medium">Safe Limit: 60%</span>
            </div>
        </div>

        <div className="space-y-3 mb-6 bg-brand-offWhite/50 p-4 rounded-xl">
            <div className="flex justify-between text-sm">
                <span className="text-brand-sage">Annual Interest</span>
                <span className="font-bold text-brand-dark">5.5%</span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-brand-sage">Liquidation Price</span>
                <span className="font-bold text-brand-dark">$38.50</span>
            </div>
        </div>

        <button className="w-full bg-brand-deep hover:bg-brand-dark text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-colors">
            Confirm Borrow
        </button>
      </div>
    </div>
  );
};

// --- LEND MODAL ---
export const LendModal: React.FC<{ isOpen: boolean, onClose: () => void, pool: any }> = ({ isOpen, onClose, pool }) => {
  if (!isOpen || !pool) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-0">
      <div className="bg-white w-full max-w-md rounded-2xl md:rounded-3xl p-6 shadow-2xl animate-slide-up md:animate-fade-in">
        <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-brand-dark text-xl">Add Liquidity</h3>
            <button onClick={onClose} className="text-brand-sage hover:text-brand-dark"><i className="fa-solid fa-xmark text-xl"></i></button>
        </div>

        <div className="mb-6">
            <h4 className="font-bold text-brand-dark mb-1">{pool.name}</h4>
            <p className="text-brand-medium font-bold text-2xl">{pool.apy}% <span className="text-sm font-medium text-brand-sage">APY</span></p>
        </div>

        <div className="mb-8">
            <label className="block text-sm font-bold text-brand-sage mb-2">Deposit Amount (USDC)</label>
            <input 
                type="number" 
                className="w-full px-4 py-3 rounded-xl border border-brand-lightGray focus:border-brand-deep focus:ring-1 focus:ring-brand-deep outline-none font-bold text-lg text-brand-dark"
                placeholder="0.00"
            />
            <p className="text-right text-xs text-brand-sage mt-2 font-bold cursor-pointer">Balance: $3,217.00</p>
        </div>

        <div className="bg-brand-mint/20 border border-brand-mint/50 p-4 rounded-xl mb-6">
            <p className="text-xs text-brand-dark font-medium flex items-start gap-2">
                <i className="fa-solid fa-circle-info text-brand-medium mt-0.5"></i>
                Deposits are locked for 7 days. Interest accrues daily and is paid out in USDC.
            </p>
        </div>

        <button className="w-full bg-brand-deep hover:bg-brand-dark text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-colors">
            Confirm Deposit
        </button>
      </div>
    </div>
  );
};
