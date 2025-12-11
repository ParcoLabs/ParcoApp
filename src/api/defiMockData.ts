
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
    image: '/properties/560StateSt.png',
    tokenCount: 50,
    maxBorrow: 1250.00,
    ltv: 60
  },
  {
    id: '2',
    title: '88 Oakely Lane',
    image: '/properties/88Oakly.jpg',
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
