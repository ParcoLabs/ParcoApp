
import { Property } from '../types';

export const DEFI_STATS = {
  borrowPower: 12500.00,
  availableToBorrow: 10000.00,
  currentDebt: 2500.00,
  apr: 5.5
};

export const BORROW_PROPERTIES = [
  {
    id: '1',
    title: '560 State St',
    image: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    tokenCount: 50,
    maxBorrow: 1250.00,
    ltv: 60
  },
  {
    id: '2',
    title: '88 Oakely Lane',
    image: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    tokenCount: 20,
    maxBorrow: 450.00,
    ltv: 50
  }
];

export const LEND_POOLS = [
  {
    id: 'pool_1',
    name: 'USDC-RE Index Pool',
    apy: 8.2,
    tvl: 5200000,
    userDeposit: 1000.00
  },
  {
    id: 'pool_2',
    name: 'High Yield Residential',
    apy: 12.5,
    tvl: 1200000,
    userDeposit: 0
  }
];
