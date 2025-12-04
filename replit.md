# Parco - RWA Investment Platform

## Overview
Parco is a Real-World Asset (RWA) investment platform built with React, TypeScript, and Vite. It enables users to invest in tokenized real estate and other real-world assets through a modern web interface. The platform aims to connect traditional finance with blockchain technology, offering a new avenue for asset ownership and investment.

## User Preferences
None documented yet.

## System Architecture

### UI/UX Decisions
The platform uses React for the frontend, styled with TailwindCSS and featuring Recharts for data visualization. Google Fonts (Inter, Bungee) and Font Awesome provide consistent typography and iconography.

### Technical Implementations
- **Frontend**: React 19.2.0, TypeScript, Vite 6.2.0, React Router DOM 7.9.6.
- **Backend**: Express.js with TypeScript.
- **Database**: PostgreSQL with Prisma ORM 7.
- **Blockchain Integration**: Smart contracts (PropertyToken.sol, PropertyVault.sol) on Polygon, interacting via Ethers.js v6. Uses OpenZeppelin standards for contracts.
- **Authentication**: Clerk for user management.
- **KYC**: Sumsub WebSDK.
- **Payments**: Stripe for fiat and Coinbase Commerce for cryptocurrency.

### Feature Specifications
- **Authentication System**: Login/Register with Clerk, protected routes.
- **Marketplace**: Browse and purchase tokenized properties.
- **Portfolio Management**: Track assets, performance, and transaction history.
- **Payment Processing**: Supports credit/debit cards, ACH, and cryptocurrencies.
- **KYC/Compliance**: Integrated Sumsub for identity verification.
- **Blockchain Integration**: USDC deposits, ERC-1155 token minting for ownership, role-based access control.
- **Collateral Lending**: Borrow USDC against locked property tokens via BorrowVault smart contract (50% max LTV, 8% annual interest, 1% origination fee, 75% liquidation threshold).
- **Rent Distribution Engine**: Automated monthly distribution of rent, deducting loan interest from borrowers.
- **Demo Mode**: Comprehensive simulation environment for testing all platform features without real blockchain/payment interactions, including demo user setup, buy flow, rent cycles, borrow/repay, and governance.
- **Admin Role System**: Database-driven role-based access control (USER, TOKENIZER, ADMIN) with middleware for secure access to administrative functionalities.
- **Tokenization Review System**: Workflow for property tokenization submissions (DRAFT → SUBMITTED → IN_REVIEW → APPROVED/REJECTED → PUBLISHED).
- **Property Management System**: Admin controls for minting, listing, pausing, and unpausing properties.
- **Investor Operations System**: Admin tools to search investors, view profiles, holdings, vault balances, and loan positions.
- **Tokenizer Dashboard**: Interface for tokenizers to manage their property submissions, track progress, and view submission details.

### System Design Choices
- Client-side routing with BrowserRouter.
- Custom Express.js backend for API interactions.
- Prisma ORM for database operations and atomic transactions.
- Role-based access control implemented in smart contracts and backend middleware.
- Environment-based configuration for sensitive data.

## External Dependencies
- **Clerk**: User authentication and authorization.
- **Stripe**: Fiat payments (credit/debit card, ACH) and webhook management via `stripe-replit-sync`.
- **Coinbase Commerce**: Cryptocurrency payments.
- **Sumsub**: KYC verification.
- **Alchemy RPC**: Blockchain interactions on Polygon.
- **PostgreSQL (Replit Neon)**: Main database.
- **Vite**: Frontend build tool.
- **React Router DOM**: Client-side routing.
- **Recharts**: Data visualization.
- **Font Awesome**: Icons.
- **Google Fonts**: Typography.
- **OpenZeppelin Contracts**: Smart contract development standards.
- **Ethers.js**: Ethereum blockchain interaction library.