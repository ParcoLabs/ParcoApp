# Parco - RWA Investment Platform

## Overview
Parco is a Real-World Asset (RWA) investment platform built with React, TypeScript, and Vite. It enables users to invest in tokenized real estate and other real-world assets through a modern web interface. The platform aims to connect traditional finance with blockchain technology, offering a new avenue for asset ownership and investment.

## User Preferences
None documented yet.

## System Architecture

### Technology Stack
- **Frontend Framework**: React 19.2.0 with TypeScript
- **Build Tool**: Vite 6.2.0
- **Routing**: React Router DOM 7.9.6
- **UI Styling**: TailwindCSS (via CDN)
- **Charts**: Recharts 3.5.1
- **Fonts**: Google Fonts (Inter, Bungee)
- **Icons**: Font Awesome 6.4.0
- **Authentication**: Clerk (email/password, Google OAuth, Apple OAuth)
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM 7
- **Payments**: Stripe (via stripe-replit-sync for managed webhooks)
- **KYC**: Sumsub WebSDK
- **Blockchain**: Smart contracts (PropertyToken.sol, PropertyVault.sol) on Polygon, interacting via Ethers.js v6.

### Key Features
- **Authentication System**: Login/Register with Clerk, protected routes.
- **Marketplace**: Browse and purchase tokenized properties, public viewing available.
- **Portfolio Management**: Track owned assets, performance, and transaction history.
- **Payment Processing**: Supports various methods including credit/debit cards, ACH bank transfers (via Stripe), and cryptocurrency payments (via Coinbase Commerce).
- **KYC/Compliance**: Integrated Sumsub for identity verification.
- **Blockchain Integration**: USDC deposits, ERC-1155 token minting for property ownership, role-based access control for contract operations.
- **Collateral Lending**: Borrow USDC against locked property tokens with BorrowVault smart contract (50% max LTV, 8% annual interest, 1% origination fee).
- **API Endpoints**: Comprehensive API for properties, portfolio data, payments, KYC, borrowing, and repayment.

### Borrowing System
- **BorrowVault.sol**: Smart contract for collateral-based USDC lending with lock/unlock, LTV calculations, interest accrual, and liquidation mechanisms.
- **Loan Terms**: 50% max LTV, 8% annual interest rate (800 bps), 1% origination fee, 75% liquidation threshold.
- **Collateral Tracking**: BorrowCollateral model tracks locked tokens per property with lock/unlock transaction hashes.
- **Repayment Tracking**: BorrowRepayment model records each repayment with principal/interest breakdown.
- **Disbursement**: Loan proceeds credited to vault balance (Stripe Transfers available when configured).
- **Endpoints**: POST /api/borrow (lock collateral, issue loan), POST /api/repay (process payment, unlock on full repayment), GET /api/borrow/position, GET /api/borrow/estimate, GET /api/borrow/history.

### Rent Distribution Engine
- **Scheduled Cron Job**: Runs on the 1st of each month (configurable via RENT_DISTRIBUTION_CRON env var).
- **Distribution Flow**: Fetches pending rent payments → calculates per-token amounts → distributes proportionally to holders → deducts loan interest from borrowers → updates vault balances.
- **Interest Deduction**: Automatically deducts accrued loan interest from rent distributions, updating lastInterestUpdate and accruedInterest on borrow positions.
- **Tracking Models**: RentDistribution (per-holder distribution records), DistributionRun (batch run history with stats).
- **Idempotent Processing**: Rent payments marked as COMPLETED after distribution to prevent duplicate processing.
- **Endpoints**: POST /api/rent/distribute (manual trigger), POST /api/rent/payments (create rent payment), GET /api/rent/payments, GET /api/rent/distributions (user history), GET /api/rent/history (run history), GET /api/rent/summary (user earnings).

### System Design
- The application uses a client-side routing approach with BrowserRouter.
- Frontend communicates with a custom Express.js backend.
- Database interactions are handled via Prisma ORM.
- Smart contracts are designed with OpenZeppelin standards, including ERC1155, AccessControl, Pausable, and ReentrancyGuard.
- Role-based access control is implemented in smart contracts for administrative and operational functions.
- Atomic transactions are managed using Prisma's `$transaction` for complex operations like purchases.
- Environment-based configuration for API keys and contract addresses.

## External Dependencies
- **Clerk**: For user authentication and authorization.
- **Stripe**: For credit/debit card and ACH bank payments, integrated with `stripe-replit-sync` for webhook management.
- **Coinbase Commerce**: For cryptocurrency payments (BTC, ETH, SOL, USDC, USDT, DAI).
- **Sumsub**: For Know Your Customer (KYC) verification.
- **Alchemy RPC**: Used for blockchain interactions on Polygon.
- **PostgreSQL (Replit Neon)**: Primary database for application data.
- **Vite**: Frontend build tool.
- **React Router DOM**: For client-side routing.
- **Recharts**: For data visualization and charts.
- **Font Awesome**: For icons.
- **Google Fonts**: For typography (Inter, Bungee).
- **OpenZeppelin Contracts**: Base for smart contract development.
- **Ethers.js**: Library for interacting with Ethereum blockchain and smart contracts.

### Demo Mode
The platform includes a comprehensive Demo Mode for testing and demonstration purposes:
- **Server Environment Variable**: Set `DEMO_MODE=true` to enable demo mode availability on the server.
- **Per-User Toggle**: Each user can enable/disable demo mode for themselves via Settings page toggle switch.
- **Activation Logic**: Demo mode is active when BOTH server `DEMO_MODE=true` AND user has `isDemoUser=true`.
- **Backend Simulation**: When enabled, the backend simulates all blockchain and payment operations without making real calls.
- **KYC Auto-Approval**: Demo mode auto-approves KYC verification with mock Sumsub IDs.
- **Mock Transactions**: All payment and blockchain transactions generate mock IDs and hashes.
- **Frontend Indicator**: A "Demo Mode" badge displays in the navigation sidebar when demo mode is active.
- **API Response Flag**: All API responses include a `demoMode: true` flag when demo mode is enabled.
- **System Config Endpoint**: GET /api/system/config returns the current demo mode status and feature flags.
- **User Demo Mode Endpoint**: GET/POST /api/user/demo-mode for reading/toggling user's demo preference.

### Isolated Demo Environment
Complete sandbox environment for testing all platform features without real blockchain/payment interactions:

#### 1. Demo User Setup (POST /api/demo/create-user)
- Creates or updates user with auto-approved KYC (VERIFIED status)
- Pre-funds vault with $25,000 USDC
- Initializes empty holdings for all active properties
- UI: "Start Demo" button on Dashboard when demo mode is active

#### 2. Demo Buy Flow (POST /api/demo/buy)
- Deducts from demo vault balance (no real payment)
- Creates fake transaction with demo_tx_* hash
- Updates holdings with purchased tokens
- Decrements available property tokens

#### 3. Demo Rent Cycle (POST /api/demo/run-rent-cycle)
- Calculates rent based on property APY and token holdings
- Formula: (tokenPrice * quantity * annualYield/12)
- Creates RentPayment and RentDistribution records
- Credits rent to vault balance and totalEarned
- UI: "Run Rent Cycle" button on Dashboard (visible after setup)

#### 4. Demo Borrow/Repay System
- **Borrow (POST /api/demo/borrow)**: Lock tokens as collateral, receive USDC loan (50% max LTV, 8% interest, 1% origination fee)
- **Repay (POST /api/demo/repay)**: Pay back principal + interest, unlock collateral on full repayment
- All operations use demo transaction hashes

#### 5. Demo Governance (Proposals & Voting)
- **Create Proposal (POST /api/demo/proposals/create)**: Title, description, voting duration
- **Vote (POST /api/demo/proposals/vote)**: FOR, AGAINST, or ABSTAIN with voting power based on token holdings
- **View Proposals (GET /api/demo/proposals)**: List all proposals with vote counts
- Proposal and Vote models in Prisma schema
- UI: Governance page (only visible in demo mode) accessible from sidebar

#### 6. Demo Reset (POST /api/demo/reset)
- Clears all user transactions, holdings, borrow positions, rent distributions, and votes
- Resets vault to $25,000 USDC initial balance
- Recreates empty holdings for all properties
- UI: "Reset Demo Environment" button in Settings (demo mode section)

#### Demo Status (GET /api/demo/status)
Returns comprehensive status including vault balance, portfolio value, active borrow positions, and transaction count.

#### Frontend Components
- **useDemo hook** (frontend/hooks/useDemo.ts): All demo API interactions
- **DemoModeContext**: Global demo state and badge display
- **Dashboard**: Start Demo button, Run Rent Cycle button, rent result modal
- **Settings**: Demo Mode section with reset functionality
- **Governance**: Proposal creation and voting interface (demo only)
- **Navigation**: Governance link visible only in demo mode