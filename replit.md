# Parco - RWA Investment Platform

## Overview
Parco is a Real-World Asset (RWA) investment platform built with React, TypeScript, and Vite. This application allows users to invest in tokenized real estate and other real-world assets through a modern web interface.

**Original Source**: Imported from AI Studio (Google Gemini)
**AI Studio URL**: https://ai.studio/apps/drive/1Z8KEuVaYpugHFbaldcQf1jyqWirlXfi2

## Project Status
- **Current State**: Successfully imported and configured for Replit environment
- **Setup Date**: November 30, 2025
- **Environment**: Development mode using Vite dev server

## Recent Changes (Nov 30, 2025)
1. Installed Node.js dependencies via npm
2. Updated vite.config.ts to use port 5000 (required for Replit webview)
3. Added `allowedHosts: true` to allow Replit proxy domains
4. Configured HMR with WSS protocol for Replit's HTTPS proxy
5. Removed AI Studio importmap from index.html and added proper Vite script tag
6. Configured workflow for frontend dev server on port 5000
7. Set up static deployment configuration (builds to `dist/` folder)

## Project Architecture

### Technology Stack
- **Frontend Framework**: React 19.2.0 with TypeScript
- **Build Tool**: Vite 6.2.0
- **Routing**: React Router DOM 7.9.6
- **UI Styling**: TailwindCSS (via CDN)
- **Charts**: Recharts 3.5.1
- **Fonts**: Google Fonts (Inter, Bungee)
- **Icons**: Font Awesome 6.4.0

### Directory Structure
```
/
├── frontend/               # Frontend components and pages
│   ├── api/               # Mock data for DeFi and marketplace
│   ├── components/        # Reusable UI components
│   │   ├── defi/         # DeFi-specific components
│   │   ├── Navigation.tsx
│   │   └── PropertyCard.tsx
│   ├── context/          # React context (Auth)
│   ├── mobile/           # Mobile-optimized views
│   ├── pages/            # Page components
│   │   ├── defi/        # DeFi pages
│   │   ├── Dashboard.tsx
│   │   ├── KYC.tsx
│   │   ├── Login.tsx
│   │   ├── Marketplace.tsx
│   │   ├── Portfolio.tsx
│   │   ├── Register.tsx
│   │   ├── Settings.tsx
│   │   └── TokenDetails.tsx
│   └── public/           # Static assets
│       └── brand/        # Brand assets (logos)
├── backend/              # Backend architecture documentation
│   └── architecture.ts   # Backend module manifest (not implemented)
├── App.tsx              # Main app component with routing
├── index.tsx            # App entry point
├── index.html           # HTML template
├── types.ts             # TypeScript type definitions
├── vite.config.ts       # Vite configuration
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
This project expects a `GEMINI_API_KEY` environment variable for AI features (defined in vite.config.ts).

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
- The app uses HashRouter for client-side routing
- TailwindCSS is loaded via CDN (not ideal for production, but works for demo)
- Mock data is used throughout the application
- No real backend or database connections are implemented
- No API integrations are currently configured
