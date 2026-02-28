# Parco - RWA Investment Platform

### Overview
Parco is a Real-World Asset (RWA) investment platform that bridges traditional finance with blockchain technology. It enables investment in tokenized real estate and other real-world assets through a modern web interface. The platform aims to revolutionize asset ownership and investment via tokenization, robust portfolio management, and comprehensive financial tools, including a property marketplace, DeFi integrations, and a simulated demo mode. The project's vision is to make real-world asset investment more accessible and liquid, leveraging blockchain for transparency and efficiency.

### User Preferences
None documented yet.

### System Architecture

#### UI/UX Decisions
The frontend uses React, TailwindCSS for styling, and Recharts for data visualization. Google Fonts (Inter, Bungee) and Font Awesome are used for typography and iconography. The design is fully mobile-responsive, adapting layouts for Investor, Tokenizer, and Admin dashboards to various screen sizes.

#### Technical Implementations
- **Frontend**: React, TypeScript, Vite, React Router DOM.
- **Backend**: Express.js with TypeScript.
- **Database**: PostgreSQL with Prisma ORM.
- **Blockchain Integration**: Smart contracts (PropertyToken.sol, PropertyVault.sol, AllowlistRegistry.sol, RestrictedToken.sol) on Polygon, interacting via Ethers.js. Hardhat is used for smart contract development and testing.
- **Authentication**: Clerk for user identity management.
- **KYC**: Sumsub WebSDK for identity verification.
- **Payments**: Stripe for fiat payments and Coinbase Commerce for cryptocurrency transactions.

#### Feature Specifications
- **Authentication**: Secure user authentication and authorization.
- **Marketplace**: Platform for browsing and purchasing tokenized properties.
- **Portfolio Management**: Tools for tracking assets, performance, and transaction history.
- **Holding Details**: Detailed views of token holdings with charts and balances.
- **Payment Processing**: Support for various payment methods including credit/debit cards, ACH, and cryptocurrency.
- **Blockchain Features**: USDC deposits, ERC-1155 token minting, and role-based access control for blockchain operations.
- **Collateral Lending**: Functionality to borrow USDC against locked property tokens.
- **Rent Distribution Engine**: Automated monthly rent distribution with loan interest deductions.
- **Demo Mode**: A comprehensive simulation environment for testing all platform functionalities without real-world financial or blockchain interactions.
- **Admin Role System**: Database-driven role-based access control (USER, TOKENIZER, ADMIN).
- **Tokenization Review System**: Manages the property tokenization submission workflow.
- **Property Capabilities**: Admin-managed flags for property features (e.g., secondary market, borrowing, transfer restrictions).
- **Investor Engagement Tracking**: Records investor activity, calculates engagement scores, and sends notifications.
- **Issuance Pipeline Board**: Kanban-style board for administrators to track property tokenization cases.
- **Eligibility Gating**: System to enforce progression rules for tokenization cases, with admin override capabilities.
- **Property Management**: Admin tools for minting, listing, pausing, and unpausing properties.
- **Investor Operations**: Admin tools to manage investors, view profiles, holdings, and loan positions.
- **Tokenizer Dashboard**: Dual-view interface for pre-tokenization progress and post-tokenization property overview.
- **Admin Dashboard**: Centralized interface for platform administration.
- **Mint & Activate**: Automated process for minting and activating tokenized properties on the blockchain, including compliance checks.
- **KYC/Accreditation Scaffolding**: Provider-agnostic compliance routes for KYC and accreditation verification, with demo mode.
- **Cap Table Snapshots**: Functionality to capture and store historical cap table data for properties.
- **Investor Statements**: Generation of per-investor periodic statements based on holdings and rent distributions.
- **REG_D Preset**: Automated configuration for Reg D offerings, including transfer policies and investor accreditation gating.
- **AI Document Engine**: Extracts and verifies structured data from uploaded documents (e.g., PDFs) using AI, defining critical fields for tokenization.
- **Monthly Close Workflow**: Structured process for drafting, reviewing, and publishing monthly reports per property.
- **Investor Reporting Center**: Centralized access for investors to view monthly updates, reports, distributions, statements, and governance information.
- **Offering Packet Generator**: Compiles verified and extracted data into a structured offering packet draft, with optional AI-driven investor-friendly language rewriting.
- **Compliance Pack**: System for defining, applying, and tracking compliance requirements and evidence for tokenized properties.
- **Servicing Distribution Runs**: `ServicingDistributionRun` and `ServicingDistributionLineItem` models for per-property distribution management. Routes: create (pro-rata by Holding), approve, pay (OFFCHAIN SENT), list. TokenizerPostDashboard Distributions panel. AuditEvent logging.
- **Admin Compliance Dashboard**: `src/pages/admin/ComplianceDashboard.tsx` at `/admin/compliance`. Fetches due-soon compliance items with filters by status/property. Table with evidence upload and mark-complete actions.
- **KPI Snapshots**: `ServicingKpiSnapshot` model captures occupancy rate, rental income, expenses, net profit per property. Admin endpoint `POST /api/servicing/property/:propertyId/kpi`. KPI input form on TokenizerPostDashboard.
- **Servicing Overview**: `GET /api/servicing/property/:propertyId/overview` returns latest KPI, next due compliance, latest report runs, latest distributions, and servicing schedule summary. Displayed as "Servicing Overview" card on TokenizerPostDashboard.
- **Governance Primitives**: `GovernanceNotice` (DRAFT/PUBLISHED), `GovernanceVote` (OPEN/CLOSED with JSON options), `GovernanceBallot` (unique per user+vote). Admin endpoints in `/api/admin/` for create/publish notices and create/close votes. `GET /api/admin/property/:propertyId/governance` lists all. Investor endpoints: `POST /api/servicing/investor/votes/:voteId/cast` and `GET /api/servicing/investor/property/:propertyId/governance`. Admin governance UI on TokenizerPostDashboard. Investor governance display on HoldingDetails Reporting tab.
- **Tax Document Scaffolding**: `TaxDocument` model with @@unique([userId, propertyId, year, type]). Admin endpoint `POST /api/admin/property/:propertyId/tax-pack/generate` creates annual summary placeholders per holder (idempotent via upsert). Investor endpoint `GET /api/servicing/investor/tax-documents` lists user's docs. TokenizerPostDashboard "Tax Documents" section with year input + generate button. HoldingDetails Reporting tab shows tax docs filtered by property.
- **Admin Roadmap**: `src/pages/admin/Roadmap.tsx` at `/admin/roadmap`. Static internal page showing 14 platform modules with status (LIVE/IN BUILD/LOCKED), dependency checklists, category filters (Issuance/Servicing/Compliance/DeFi), progress metrics, and links to relevant admin pages. No backend required.

#### System Design Choices
- Client-side routing with React Router DOM.
- Custom Express.js backend for API services (entrypoint: `server/index.ts`).
- Separate BullMQ worker process (entrypoint: `server/worker.ts`) for async job processing.
- Queue infrastructure: BullMQ + ioredis (`server/lib/queue.ts`). Queue name: `parco`. Requires `REDIS_URL` env var.
- Job types: `DOC_EXTRACT`, `REPORT_DRAFT`, `DISTRIBUTION_PREP`, `BLOCKCHAIN_DEPLOY`, `BLOCKCHAIN_ALLOWLIST`, `BLOCKCHAIN_MINT`.
- All jobs use idempotent handlers, exponential backoff (5s base), and 3 retries.
- API enqueues jobs via `enqueue()` from `server/lib/queue.ts`; worker processes them independently.
- Prisma ORM for atomic database operations.
- Role-based access control implemented across smart contracts and backend.
- Environment-based configuration for sensitive data.
- Standard Vite + React project structure.
- Document uploads handled via `multer` (local storage, with future R2 integration).
- Issuance roadmap framework supporting multiple regulatory tracks (e.g., SERIES_LLC, REG_CF, REG_A, REG_D).
- Eligibility Engine performs checks based on state enablement, price caps, and document completeness.
- npm scripts: `build` (vite + prisma generate), `start:api` (production API), `start:worker` (production worker), `migrate` (prisma migrate deploy).

### External Dependencies
- **Clerk**: User authentication.
- **Stripe**: Fiat payments.
- **Coinbase Commerce**: Crypto payments.
- **Sumsub**: KYC verification.
- **Alchemy RPC**: Polygon blockchain interaction.
- **PostgreSQL (Replit Neon)**: Database.
- **Vite**: Frontend build.
- **React Router DOM**: Client-side routing.
- **Recharts**: Data visualization.
- **Font Awesome**: Icons.
- **Google Fonts**: Typography.
- **OpenZeppelin Contracts**: Smart contract standards.
- **Ethers.js**: Ethereum interaction.
- **OpenAI (via Replit AI Integrations)**: AI document processing.
- **BullMQ + ioredis**: Job queue for async processing (requires `REDIS_URL`).