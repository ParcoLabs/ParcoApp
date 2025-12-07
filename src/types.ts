// 5. Database Schema Reflection (Supabase + Prisma)

export enum UserKycStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export type UserRole = 'USER' | 'TOKENIZER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  kycStatus: UserKycStatus;
  usdcBalance: number;
  role?: UserRole;
  tokenizerViewMode?: 'pre' | 'post';
}

export enum PropertyType {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  STR = 'STR'
}

export type BlockchainNetwork = 'polygon' | 'solana';

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
  images?: string[];
  description?: string;
  type: PropertyType;
  chain: BlockchainNetwork;
  contractAddress: string;
  address?: string;
  squareFeet?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  monthlyRent?: number;
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