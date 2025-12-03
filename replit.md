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
- **API Endpoints**: Comprehensive API for properties, portfolio data, payments, and KYC.

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