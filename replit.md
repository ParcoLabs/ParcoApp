# Parco - RWA Investment Platform

### Overview
Parco is a Real-World Asset (RWA) investment platform that connects traditional finance with blockchain technology. Built with React, TypeScript, and Vite, it allows users to invest in tokenized real estate and other real-world assets through a modern web interface. The platform's vision is to offer a new avenue for asset ownership and investment, focusing on tokenization, robust portfolio management, and comprehensive financial tools. Key capabilities include a property marketplace, DeFi integrations, and a simulated demo mode for testing all features.

### User Preferences
None documented yet.

### System Architecture

#### UI/UX Decisions
The frontend is built with React, styled using TailwindCSS for utility-first styling, and incorporates Recharts for interactive data visualization. Typography is standardized with Google Fonts (Inter, Bungee), and iconography is provided by Font Awesome. The platform ensures full mobile responsiveness across all dashboard types (Investor, Tokenizer, Admin), adapting layouts from multi-column desktop views to single-column mobile interfaces with optimized navigation elements like bottom tab bars.

#### Technical Implementations
- **Frontend**: React 19.2.0, TypeScript, Vite 6.2.0, React Router DOM 7.9.6.
- **Backend**: Express.js with TypeScript.
- **Database**: PostgreSQL managed with Prisma ORM 7.
- **Blockchain Integration**: Utilizes smart contracts (PropertyToken.sol, PropertyVault.sol) on the Polygon network, interacting via Ethers.js v6, adhering to OpenZeppelin standards.
- **Authentication**: Clerk for user identity and authentication.
- **KYC**: Integrated with Sumsub WebSDK for identity verification.
- **Payments**: Stripe handles fiat transactions, and Coinbase Commerce manages cryptocurrency payments.

#### Feature Specifications
- **Authentication**: Secure user login/registration with Clerk and protected routes.
- **Marketplace**: Browse and purchase tokenized properties.
- **Portfolio Management**: Comprehensive tracking of assets, performance, and transaction history.
- **Holding Details**: Detailed view for individual token holdings, including price charts, balance overviews, insights, and governance participation.
- **Payment Processing**: Supports credit/debit cards, ACH, and cryptocurrency payments.
- **Blockchain Features**: Facilitates USDC deposits, ERC-1155 token minting for ownership, and role-based access control.
- **Collateral Lending**: Allows users to borrow USDC against locked property tokens via a BorrowVault smart contract with defined LTV, interest, and liquidation thresholds.
- **Rent Distribution Engine**: Automates monthly rent distributions, including loan interest deductions.
- **Demo Mode**: A comprehensive simulation environment for testing all platform functionalities without real-world financial or blockchain interactions. This includes simulated crypto wallets, property purchases, borrowing, DeFi lending, governance voting, and rent cycles. All demo data is isolated to prevent contamination of production data.
- **Admin Role System**: Database-driven role-based access control (USER, TOKENIZER, ADMIN) with middleware for secure administrative access.
- **Tokenization Review System**: Manages the workflow for property tokenization submissions through defined statuses (DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, PUBLISHED).
- **Property Management**: Admin tools for minting, listing, pausing, and unpausing properties.
- **Investor Operations**: Admin tools to manage investors, view profiles, holdings, and loan positions.
- **Tokenizer Dashboard**: A dual-view interface for tokenizers, offering pre-tokenization progress tracking (application, documents, valuation) and post-tokenization property overview with detailed statistics.
- **Admin Dashboard**: A dedicated interface for administrators with navigation for managing tokenizations, properties, investors, rent distribution, and demo tools, providing platform statistics and quick actions.

#### System Design Choices
- Employs client-side routing with React Router DOM.
- Utilizes a custom Express.js backend for API services.
- Leverages Prisma ORM for robust database operations and atomic transactions.
- Implements role-based access control both in smart contracts and backend middleware for enhanced security.
- Adheres to environment-based configuration for managing sensitive data.
- Follows a standard Vite + React project structure.
- **Document Upload Reality Check**: The current implementation for document uploads in the tokenizer dashboard is UI-only. Files are selected and stored in React component state but are **not** sent to a backend server for persistent storage. There is no server-side endpoint or storage solution configured for file uploads.

### External Dependencies
- **Clerk**: User authentication and authorization.
- **Stripe**: Fiat payment processing, including credit/debit cards and ACH.
- **Coinbase Commerce**: Cryptocurrency payment processing.
- **Sumsub**: KYC (Know Your Customer) identity verification.
- **Alchemy RPC**: Blockchain interactions, specifically on the Polygon network.
- **PostgreSQL (Replit Neon)**: Primary database solution.
- **Vite**: Frontend build tool.
- **React Router DOM**: Client-side routing library.
- **Recharts**: Data visualization library.
- **Font Awesome**: Icon library.
- **Google Fonts**: Custom typography.
- **OpenZeppelin Contracts**: Standardized smart contract libraries.
- **Ethers.js**: Ethereum blockchain interaction library.

---

## SYSTEM MAP

### Demo Mode Detection Points

Demo mode is detected at multiple layers. Here is every location where it is checked:

| File | Function / Export | Detection Logic |
|------|-------------------|-----------------|
| `server/lib/demoMode.ts` | `isDemoMode()` | `process.env.DEMO_MODE === 'true'` — original helper, used by existing routes (`buy`, `borrow`, `rent`, `kyc`, `admin`, `system`, `userSettings`, `demo`) |
| `server/utils/demoMode.ts` | `isDemoMode(req?)` | Unified check: returns `true` if `process.env.DEMO_MODE === 'true'` OR `server/lib/demoMode.isDemoMode()` returns true OR `req.user.isDemoUser` is truthy. New helper for issuance/servicing engine integration. |
| `server/routes/demo.ts` | `requireDemoMode` middleware | Calls `server/lib/demoMode.isDemoMode()`; returns 403 if false. Gates all `/api/demo/*` routes. |
| `server/index.ts` | Startup log | Logs whether demo mode is enabled via `isDemoMode()` |
| `src/context/DemoModeContext.tsx` | `DemoModeProvider` | Fetches `/api/system/config` for `serverDemoEnabled` and `/api/user/demo-mode` for `userDemoEnabled`. Demo is active only when both are true. |
| `src/hooks/useDemo.ts` | `useDemoMode()` | Consumes `DemoModeContext` |

### Demo Response Utilities

| File | Exports | Purpose |
|------|---------|---------|
| `server/utils/demoResponses.ts` | `mockIssuanceCase(overrides?)` | Returns a stable mock `DemoIssuanceCase` payload (id, propertyId, status, tokenSymbol, totalTokens, tokenPrice, totalValue, timestamps). |
| `server/utils/demoResponses.ts` | `mockEligibilityCheck(userId, overrides?)` | Returns a stable mock `DemoEligibilityResult` (eligible, kycLevel, accreditationStatus, maxInvestment, reasons). |
| `server/utils/demoResponses.ts` | `mockExtractionRunStatus(runId?, overrides?)` | Returns a stable mock `DemoExtractionRunStatus` (runId, status, documentsProcessed/Total, extractedFields, errors, timestamps). |

All three accept optional `overrides` to customize individual fields while keeping defaults stable.