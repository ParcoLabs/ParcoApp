// 5. Database Schema Reflection (Supabase + Prisma)

export enum UserKycStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  kycStatus: UserKycStatus;
  usdcBalance: number;
}

export enum PropertyType {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  STR = 'STR'
}

export interface Property {
  id: string;
  title: string;
  location: string;
  totalValue: number;
  tokenPrice: number;
  tokensAvailable: number;
  tokensTotal: number;
  rentalYield: number; // APY
  image: string;
  type: PropertyType;
  // Phase 1: Polygon
  contractAddress: string; 
}

export interface Holding {
  id: string;
  propertyId: string;
  userId: string;
  tokenCount: number;
  avgCostBasis: number;
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'BUY' | 'SELL' | 'RENT_PAYOUT';
  amount: number;
  currency: 'USDC' | 'USD';
  status: 'COMPLETED' | 'PENDING';
  date: string;
}

// 4. Backend Architecture Module Types
export interface BackendModule {
  name: string;
  description: string;
  status: 'ACTIVE' | 'MAINTENANCE';
}