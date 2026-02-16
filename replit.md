# Parco - RWA Investment Platform

### Overview
Parco is a Real-World Asset (RWA) investment platform bridging traditional finance with blockchain technology. It enables investment in tokenized real estate and other real-world assets through a modern web interface. The platform aims to revolutionize asset ownership and investment via tokenization, robust portfolio management, and comprehensive financial tools, including a property marketplace, DeFi integrations, and a simulated demo mode.

### User Preferences
None documented yet.

### System Architecture

#### UI/UX Decisions
The frontend utilizes React, TailwindCSS for styling, and Recharts for data visualization. Typography is based on Google Fonts (Inter, Bungee), and iconography uses Font Awesome. The platform is fully mobile-responsive, adapting layouts for Investor, Tokenizer, and Admin dashboards from multi-column desktop views to single-column mobile interfaces with optimized navigation.

#### Technical Implementations
- **Frontend**: React, TypeScript, Vite, React Router DOM.
- **Backend**: Express.js with TypeScript.
- **Database**: PostgreSQL with Prisma ORM.
- **Blockchain Integration**: Smart contracts (PropertyToken.sol, PropertyVault.sol) on Polygon, interacting via Ethers.js, adhering to OpenZeppelin standards.
- **Authentication**: Clerk for user identity.
- **KYC**: Sumsub WebSDK for identity verification.
- **Payments**: Stripe for fiat, Coinbase Commerce for crypto.

#### Feature Specifications
- **Authentication**: Secure login/registration and protected routes.
- **Marketplace**: Browse and purchase tokenized properties.
- **Portfolio Management**: Asset tracking, performance, and transaction history.
- **Holding Details**: Detailed views for individual token holdings, including charts, balances, and governance.
- **Payment Processing**: Supports credit/debit cards, ACH, and cryptocurrency.
- **Blockchain Features**: USDC deposits, ERC-1155 token minting, role-based access control.
- **Collateral Lending**: Borrow USDC against locked property tokens via a BorrowVault smart contract.
- **Rent Distribution Engine**: Automates monthly rent distributions, including loan interest deductions.
- **Demo Mode**: A comprehensive simulation environment for testing all platform functionalities without real-world financial or blockchain interactions, including simulated crypto wallets, property purchases, borrowing, DeFi lending, governance voting, and rent cycles.
- **Admin Role System**: Database-driven role-based access control (USER, TOKENIZER, ADMIN).
- **Tokenization Review System**: Manages property tokenization submission workflow through defined statuses.
- **Property Management**: Admin tools for minting, listing, pausing, and unpausing properties.
- **Investor Operations**: Admin tools to manage investors, view profiles, holdings, and loan positions.
- **Tokenizer Dashboard**: Dual-view interface for pre-tokenization progress tracking and post-tokenization property overview.
- **Admin Dashboard**: Dedicated interface for platform administration, including tokenizations, properties, investors, rent distribution, and demo tools.

#### System Design Choices
- Client-side routing with React Router DOM.
- Custom Express.js backend for API services.
- Prisma ORM for database operations and atomic transactions.
- Role-based access control implemented in smart contracts and backend middleware.
- Environment-based configuration for sensitive data.
- Standard Vite + React project structure.
- Document uploads handled via `multer` for local storage, with a future migration planned to R2 signed uploads. Demo mode simulates file uploads without actual I/O.
- Issuance roadmap framework supporting multiple regulatory tracks (e.g., SERIES_LLC, REG_CF, REG_A, REG_D) with dedicated models for templates, state-specific rules, eligibility checks, and approval tasks.
- Eligibility Engine (`server/services/eligibilityEngine.ts`) performs checks on state enablement, price caps, document completeness, and critical fields for tokenization submissions.

### External Dependencies
- **Clerk**: User authentication and authorization.
- **Stripe**: Fiat payment processing.
- **Coinbase Commerce**: Cryptocurrency payment processing.
- **Sumsub**: KYC identity verification.
- **Alchemy RPC**: Blockchain interactions on the Polygon network.
- **PostgreSQL (Replit Neon)**: Primary database.
- **Vite**: Frontend build tool.
- **React Router DOM**: Client-side routing.
- **Recharts**: Data visualization.
- **Font Awesome**: Icon library.
- **Google Fonts**: Custom typography.
- **OpenZeppelin Contracts**: Standardized smart contract libraries.
- **Ethers.js**: Ethereum blockchain interaction library.