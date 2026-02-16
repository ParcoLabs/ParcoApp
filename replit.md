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
- **Blockchain Integration**: Smart contracts (PropertyToken.sol, PropertyVault.sol, AllowlistRegistry.sol, RestrictedToken.sol) on Polygon, interacting via Ethers.js, adhering to OpenZeppelin standards. Hardhat for smart contract development/testing (ESM-compatible: uses `hardhat.config.cts`, `tsconfig.hardhat.json`, run tests with `NODE_OPTIONS="--import tsx --no-warnings" TS_NODE_PROJECT=tsconfig.hardhat.json npx hardhat test`).
- **Authentication**: Clerk for user identity.
- **KYC**: Sumsub WebSDK for identity verification.
- **Payments**: Stripe for fiat, Coinbase Commerce for crypto.

#### Feature Specifications
- **Authentication**: Secure login/registration and protected routes.
- **Marketplace**: Browse and purchase tokenized properties.
- **Portfolio Management**: Asset tracking, performance, and transaction history.
- **Holding Details**: Detailed views for individual token holdings, including charts, balances, and governance.
- **Payment Processing**: Supports credit/debit cards, ACH, and cryptocurrency.
- **Blockchain Features**: USDC deposits, ERC-1155 token minting, role-based access control. Backend blockchain service (`server/services/blockchain.ts`) provides RestrictedToken + AllowlistRegistry deployment and management via ethers.js with typed config errors (HTTP 412). Admin-only API routes (`/api/blockchain`) for deploy, allowlist, and mint operations with full demo mode simulation.
- **Collateral Lending**: Borrow USDC against locked property tokens via a BorrowVault smart contract.
- **Rent Distribution Engine**: Automates monthly rent distributions, including loan interest deductions.
- **Demo Mode**: A comprehensive simulation environment for testing all platform functionalities without real-world financial or blockchain interactions, including simulated crypto wallets, property purchases, borrowing, DeFi lending, governance voting, and rent cycles.
- **Admin Role System**: Database-driven role-based access control (USER, TOKENIZER, ADMIN).
- **Tokenization Review System**: Manages property tokenization submission workflow through defined statuses.
- **Property Capabilities**: Admin-managed JSON flags per property (secondaryEnabled, borrowEnabled, transferRestricted, lockupDays) with audit trail.
- **Investor Engagement Tracking**: Activity event recording, engagement scoring, at-risk detection, daily cron nudges via Notification model.
- **Issuance Pipeline Board**: Admin kanban-style board (`/admin/pipeline`) showing IssuanceCases grouped by status columns with filtering by track and eligibility.
- **Eligibility Gating**: Status machine enforcement — cannot advance to REVIEW_READY unless eligibilityStatus is PASS. Admin override with reason creates ELIGIBILITY_OVERRIDE audit event.
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

### Compliance Pack (Servicing Standard)

`server/services/compliancePack.ts` — `applyCompliancePack(caseId, propertyId)` loads the CompliancePackTemplate for a case's track and creates ComplianceRequirement rows with calculated due dates. `mockComplianceRequirements(propertyId)` returns 5 demo requirements.

**Models:**
- `CompliancePackTemplate` — one per track (unique), holds `rules.requirements[]` array with key, label, cadence
- `ComplianceRequirement` — per-property requirements with cadence (MONTHLY/QUARTERLY/SEMI_ANNUAL/ANNUAL), status, dueAt, linked to Property and optionally IssuanceCase
- `ComplianceEvidence` — uploaded evidence files linked to requirements

**Routes (server/routes/servicing.ts):**
- `GET /api/servicing/property/:propertyId/compliance` — list compliance requirements with evidence
- `POST /api/servicing/property/:propertyId/compliance/apply` — admin: apply compliance pack from template (body: {caseId})
- `POST /api/servicing/compliance/:id/complete` — admin: mark requirement complete (body: {notes?})
- `POST /api/servicing/compliance/:id/evidence` — admin: attach evidence file (body: {name, url})

**UI:** TokenizerPostDashboard includes a "Compliance" panel listing requirements with cadence/status badges, due dates, evidence links, and completion tracking.

**Seed:** `prisma/seed-issuance.ts` includes CompliancePackTemplate rows for all 4 tracks with varying requirements per regulatory framework.