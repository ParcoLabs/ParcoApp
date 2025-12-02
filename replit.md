# Parco - RWA Investment Platform

## Overview
Parco is a Real-World Asset (RWA) investment platform built with React, TypeScript, and Vite. This application allows users to invest in tokenized real estate and other real-world assets through a modern web interface.

**Original Source**: Imported from AI Studio (Google Gemini)
**AI Studio URL**: https://ai.studio/apps/drive/1Z8KEuVaYpugHFbaldcQf1jyqWirlXfi2

## Project Status
- **Current State**: Successfully imported and configured for Replit environment
- **Setup Date**: November 30, 2025
- **Environment**: Development mode using Vite dev server

## Recent Changes (Dec 2, 2025)
20. Created GET /api/properties endpoint returning: id, name, images, APY, totalSupply, remainingSupply, description, region, tokenPrice, chain
21. Added `BlockchainNetwork` type ('polygon' | 'solana') to types.ts
22. Created ChainIndicator component with Polygon and Solana chain icons/badges
23. Added chain indicator to TokenDetails page (desktop hero section)
24. Added chain indicator to PropertyCard component (bottom-left of image)
25. Added chain indicator to TokenDetailsMobile (in metrics section)
26. Updated mock data with chain='polygon' and descriptions for all properties
27. Replaced logo-green.svg with ParcoLogoGreen.png in Navigation, Login, and Register pages
28. Configured Vite publicDir to serve brand assets from frontend/public
29. **Created GET /api/portfolio endpoint** returning:
    - Summary: total portfolio value, net worth, total invested, gains
    - Vault: USDC balance, locked balance, available balance, deposits/withdrawals
    - Holdings: property token balances with current value, gains, rent earned
    - Loans: active borrow positions with principal, interest, collateral info
    - Rent distributions: recent rent payment transactions
30. **Created GET /api/portfolio/history endpoint** with:
    - Query params: period (7d, 30d, 90d, 1y, all), type (transaction type filter)
    - Summary: deposits, withdrawals, purchases, sales, rent received, borrowings, repayments
    - Daily summary: aggregated transactions by day
    - Full transaction history with all details

## Recent Changes (Dec 1, 2025)
1. Installed Node.js dependencies via npm
2. Updated vite.config.ts to use port 5000 (required for Replit webview)
3. Added `allowedHosts: true` to allow Replit proxy domains
4. Configured HMR with WSS protocol for Replit's HTTPS proxy
5. Removed AI Studio importmap from index.html and added proper Vite script tag
6. Configured workflow for frontend dev server on port 5000
7. Set up static deployment configuration (builds to `dist/` folder)
8. **Integrated Clerk authentication** with email/password, Google OAuth, and Apple OAuth
9. Created Express backend server (port 3001) with JWT validation middleware
10. Updated Login.tsx and Register.tsx to use Clerk while preserving Parco UI design
11. Created /api/auth/sync endpoint for user registration to database
12. Switched from HashRouter to BrowserRouter for OAuth compatibility
13. Added /sso-callback route with AuthenticateWithRedirectCallback for OAuth flow
14. OAuth uses redirect flow - opens new tab if running in iframe (Replit webview)
15. **Installed Prisma ORM 7** with PostgreSQL adapter (@prisma/adapter-pg)
16. **Connected to Supabase PostgreSQL database** via pooler connection
17. **Created database schema** with 9 models: User, KYCVerification, Property, Token, Holding, VaultAccount, BorrowPosition, Transaction, RentPayment
18. Applied initial migration to Supabase database
19. Updated auth routes to use Prisma for user persistence (upsert on sync, includes VaultAccount creation)

## Project Architecture

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
- **Database**: Supabase PostgreSQL with Prisma ORM 7
- **ORM**: Prisma 7.0.1 with @prisma/adapter-pg driver

### Directory Structure
```
/
├── frontend/               # Frontend components and pages
│   ├── api/               # Mock data for DeFi and marketplace
│   ├── components/        # Reusable UI components
│   │   ├── defi/         # DeFi-specific components
│   │   ├── ChainIndicator.tsx  # Blockchain network badge (Polygon/Solana)
│   │   ├── Navigation.tsx
│   │   └── PropertyCard.tsx
│   ├── context/          # React context (Auth with Clerk)
│   ├── mobile/           # Mobile-optimized views
│   ├── pages/            # Page components
│   │   ├── defi/        # DeFi pages
│   │   ├── Dashboard.tsx
│   │   ├── KYC.tsx
│   │   ├── Login.tsx     # Clerk email/Google/Apple login
│   │   ├── Marketplace.tsx
│   │   ├── Portfolio.tsx
│   │   ├── Register.tsx  # Clerk registration
│   │   ├── Settings.tsx
│   │   └── TokenDetails.tsx
│   └── public/           # Static assets
│       └── brand/        # Brand assets (logos)
├── prisma/               # Prisma ORM configuration
│   ├── schema.prisma     # Database schema with all models
│   ├── migrations/       # Database migrations
│   └── ...
├── server/               # Express backend server
│   ├── index.ts          # Server entry point (port 3001)
│   ├── lib/
│   │   └── prisma.ts     # Prisma client singleton
│   ├── middleware/
│   │   └── auth.ts       # Clerk JWT validation middleware
│   └── routes/
│       ├── auth.ts       # Auth routes (/api/auth/sync, /api/auth/me)
│       ├── properties.ts # Properties routes (/api/properties)
│       └── portfolio.ts  # Portfolio routes (/api/portfolio, /api/portfolio/history)
├── backend/              # Backend architecture documentation
│   └── architecture.ts   # Backend module manifest (not implemented)
├── App.tsx              # Main app with Clerk provider & routing
├── index.tsx            # App entry point
├── index.html           # HTML template
├── types.ts             # TypeScript type definitions
├── vite.config.ts       # Vite configuration (proxy to backend)
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

### Key Features
1. **Authentication System**: Login/Register with protected routes
2. **Dashboard**: Overview of portfolio and market trends
3. **Marketplace**: Browse and purchase tokenized properties
4. **Portfolio Management**: Track owned assets and performance
5. **DeFi Integration**: Borrowing and lending features
6. **KYC/Compliance**: Know Your Customer verification flow
7. **Settings**: User preferences and account management

### Backend Architecture (Documented but not implemented)
The `backend/architecture.ts` file documents the intended backend modules:
- Auth Service (JWT with Clerk/Auth0)
- Payments Service (Stripe + Circle USDC)
- KYC/AML Service (Sumsub/Sardine)
- Marketplace Engine
- Tokenization Engine (ERC1155 on Polygon)
- Portfolio Engine
- Borrow Engine
- Blockchain Adapter Layer
- Admin Portal

**Note**: The backend is currently not implemented. The app uses mock data defined in `frontend/api/`.

## Environment Variables

### Required for Authentication (Clerk)
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk frontend publishable key (get from https://dashboard.clerk.com)
- `CLERK_SECRET_KEY` - Clerk backend secret key

### Optional (AI Features)
- `GEMINI_API_KEY` - For AI features (defined in vite.config.ts)

## Development

### Running Locally
The Vite dev server runs automatically via the "Dev Server" workflow:
- **Port**: 5000 (webview enabled)
- **Host**: 0.0.0.0
- **Command**: `npm run dev`

### Building for Production
```bash
npm run build
```
Builds the app to the `dist/` directory.

### Preview Production Build
```bash
npm run preview
```

## Deployment
- **Type**: Static site deployment
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

The app is configured for static deployment since it's a frontend-only application with no backend implementation.

## User Preferences
None documented yet.

## Notes
- The app uses BrowserRouter for client-side routing (required for OAuth)
- TailwindCSS is loaded via CDN (not ideal for production, but works for demo)
- Mock data is used for marketplace/DeFi features
- Database connected to Supabase PostgreSQL via Prisma ORM
- Clerk authentication fully integrated
- OAuth opens in new browser tab when accessed from Replit's iframe environment (browser security limitation)
