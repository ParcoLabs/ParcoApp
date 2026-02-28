# Parco Production Hardening Plan

**Date**: 2026-02-28
**Author**: Staff Engineering Review
**Status**: READ-ONLY AUDIT (no refactors applied)

---

## 1. Architecture Map

### 1.1 Frontend

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | React 18 + TypeScript | SPA with Vite v6 |
| Routing | react-router-dom v7 | Client-side, ~30 routes |
| Styling | Tailwind CSS v4 | Custom theme with CSS variables, dark mode via `.dark` class |
| Auth | @clerk/clerk-react | Session tokens forwarded to backend |
| State | React Context (3 providers) | AuthContext, ThemeContext, DemoModeContext |
| Charts | Recharts | Portfolio and property visualizations |
| Typography | Google Fonts (Inter, Bungee) | Loaded via CDN |
| Icons | Font Awesome 6 | Loaded via CDN |

**Route Groups:**
- **Public**: `/login`, `/register`, `/sso-callback`
- **Investor (protected)**: `/`, `/marketplace`, `/portfolio`, `/holdings/:id`, `/defi`, `/governance`, `/kyc`, `/settings`, `/payment-methods`
- **Tokenizer (role-gated)**: `/tokenizer`, `/tokenizer/my-properties`, `/tokenizer/dashboard/:id`, `/tokenizer/settings`
- **Admin (role-gated)**: `/admin`, `/admin/tokenizations`, `/admin/pipeline`, `/admin/properties`, `/admin/investors`, `/admin/rent`, `/admin/compliance`, `/admin/roadmap`, `/admin/demo`

**Key Components**: `Navigation.tsx`, `AdminNavigation.tsx`, `TokenizerNavigation.tsx`, `PropertyCard.tsx`, `CryptoDeposit.tsx`, `KycGatedButton.tsx`, `ParcoStaysTab.tsx`, `DefiComponents.tsx`

### 1.2 Backend

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Node.js + tsx | TypeScript compiled on-the-fly |
| Framework | Express.js | Port 3001 (configurable via `PORT`) |
| ORM | Prisma | PostgreSQL on Neon |
| Auth middleware | @clerk/express | `clerkMiddleware()` global, `getAuth()` per-route |
| File uploads | multer | Disk storage to `attached_assets/uploads/` |
| Scheduler | node-cron | In-process, no external queue |
| Logging | console.log/error | No structured logging library |

**Registered Route Prefixes** (all under `/api`):

| Prefix | File | Auth | Description |
|--------|------|------|-------------|
| `/auth` | auth.ts | Public/Clerk | User sync, role check |
| `/properties` | properties.ts | Mixed | Property CRUD + transfer policies |
| `/portfolio` | portfolio.ts | Clerk | User holdings |
| `/payments` | payments.ts | Clerk | Stripe payment intents |
| `/crypto` | crypto.ts | Clerk | Coinbase Commerce charges |
| `/kyc` | kyc.ts | Clerk | KYC verification flow |
| `/buy` | buy.ts | Clerk | Token purchases |
| `/borrow` | borrow.ts | Clerk | Collateral lending |
| `/rent` | rent.ts | Clerk | Rent distribution queries |
| `/admin` | admin.ts | adminOnly | Platform administration |
| `/tokenization` | tokenization.ts | tokenizerOrAdmin | Submission workflow |
| `/issuance` | issuance.ts | adminOnly | Issuance pipeline ops |
| `/servicing` | servicing.ts | Mixed | Compliance, KPI, governance, distributions, tax docs |
| `/uploads` | uploads.ts | Clerk | Document uploads (multer) |
| `/blockchain` | blockchain.ts | Clerk | On-chain operations |
| `/compliance` | compliance.ts | Clerk | KYC/accreditation gating |
| `/system` | (inline) | Public | Health checks |
| `/user` | (inline) | Clerk | Settings, demo mode toggle |
| `/demo` | (inline) | Clerk | Demo action recording |

**Webhook Endpoints** (raw body parsing):
- `POST /api/stripe/webhook/:uuid` - Stripe events
- `POST /api/coinbase/webhook` - Coinbase Commerce events
- `POST /api/kyc/sumsub/webhook` - Sumsub KYC callbacks

**Middleware Stack**:
- `cors()` - Open CORS (all origins in dev)
- `clerkMiddleware()` - Session validation
- `express.json()` - Body parsing (except webhooks)
- `generalLimiter` - 100 req/15min
- `authLimiter` - 20 req/15min
- `transactionLimiter` - 10 req/1min
- `demoActionLimiter` - 30 req/1min

### 1.3 Database

| Component | Detail |
|-----------|--------|
| Engine | PostgreSQL (Neon serverless) |
| ORM | Prisma with `prisma db push` |
| Models | 45+ models |
| Migrations | Initial migration exists; subsequent changes via `db push` |

**Model Categories:**
- **Identity**: User, KYCVerification, InvestorProfile
- **Property**: Property, Token, Holding, OnchainDeployment
- **Finance**: Transaction, VaultAccount, RentPayment, RentDistribution, CryptoPayment
- **DeFi**: BorrowPosition, BorrowCollateral, BorrowRepayment
- **Governance**: Proposal, Vote, GovernanceNotice, GovernanceVote, GovernanceBallot
- **Issuance**: TokenizationSubmission, IssuanceCase, IssuanceDocument, ExtractedField, VerifiedField
- **Servicing**: ServicingReportRun, ReportApproval, ServicingDistributionRun, ServicingDistributionLineItem, ServicingKpiSnapshot, ComplianceRequirement, ComplianceEvidence, InvestorStatement, TaxDocument
- **Compliance**: TransferPolicy, InvestorAllowlist, CapTableSnapshot
- **Activity**: InvestorActivityEvent, AuditEvent, DemoAction

### 1.4 Scheduled Jobs

| Job | Schedule | Service | Description |
|-----|----------|---------|-------------|
| Rent Distribution | `0 0 1 * *` (1st of month) | rentDistribution.ts | Calculates and distributes rent to holders |
| Engagement Check | `0 6 * * *` (daily 6am) | investorEngagement.ts | Scores investor activity, flags at-risk |

Both run in-process via `node-cron`. Configurable via `RENT_DISTRIBUTION_CRON` and `ENGAGEMENT_CHECK_CRON` env vars.

### 1.5 Smart Contracts

| Contract | Standard | Network | Purpose |
|----------|----------|---------|---------|
| PropertyToken.sol | ERC-1155 | Polygon (Amoy testnet) | Fractionalized property tokens |
| PropertyVault.sol | Custom | Polygon | USDC deposits, withdrawals, purchases |
| BorrowVault.sol | Custom | Polygon | Collateral lending engine |
| RestrictedToken.sol | ERC-20 | Polygon | Platform token with transfer restrictions |
| AllowlistRegistry.sol | Custom | Polygon | Address authorization registry |

**Toolchain**: Hardhat, Solidity 0.8.20, OpenZeppelin, ethers.js v6, Alchemy RPC

---

## 2. Local Runbook

### 2.1 Environment Variables

**Required for all modes:**
```
DATABASE_URL                       # Neon PostgreSQL connection string
VITE_CLERK_PUBLISHABLE_KEY         # Clerk frontend key
CLERK_SECRET_KEY                   # Clerk backend key
DEMO_MODE=true                     # Enable demo simulation
```

**Required for live mode (DEMO_MODE=false):**
```
STRIPE_SECRET_KEY                  # Stripe payments
COINBASE_API_KEY                   # Coinbase Commerce
COINBASE_WEBHOOK_SECRET            # Coinbase webhook verification
SUMSUB_APP_TOKEN                   # Sumsub KYC
SUMSUB_SECRET_KEY                  # Sumsub KYC
SUMSUB_LEVEL_NAME                  # Sumsub verification level
COMPLIANCE_WEBHOOK_SECRET          # KYC webhook HMAC
ALCHEMY_API_KEY                    # Polygon RPC
OPERATOR_PRIVATE_KEY               # On-chain transaction signing
DEPLOYER_PRIVATE_KEY               # Contract deployment
RPC_URL                            # Override Alchemy RPC URL
PROPERTY_TOKEN_ADDRESS             # Deployed ERC-1155 address
PROPERTY_VAULT_ADDRESS             # Deployed vault address
BORROW_VAULT_ADDRESS               # Deployed lending vault
POLYGON_NETWORK                    # amoy | mainnet
```

**Optional:**
```
AI_INTEGRATIONS_OPENAI_API_KEY     # Document extraction AI
AI_INTEGRATIONS_OPENAI_BASE_URL    # OpenAI endpoint override
GEMINI_API_KEY                     # Alternative AI provider
FRONTEND_URL                       # CORS origin (required in production)
REPLIT_DOMAINS                     # Comma-separated Replit domain list for CORS
NODE_ENV                           # development | production
PORT                               # Backend port (default: 3001)
RENT_DISTRIBUTION_CRON             # Override monthly rent schedule
ENGAGEMENT_CHECK_CRON              # Override daily engagement schedule
```

### 2.2 Commands

```bash
# Install dependencies
npm install

# Push schema to database (no migrations)
npx prisma db push

# Generate Prisma client
npx prisma generate

# Start backend (dev, with hot reload via tsx)
npm run dev:server          # Express on :3001

# Start frontend (dev, Vite)
npm run dev                 # Vite on :5000, proxies /api to :3001

# Compile smart contracts
npx hardhat compile

# Deploy contracts (testnet)
npx hardhat run scripts/deploy.js --network amoy
```

### 2.3 Ports

| Service | Port | Protocol |
|---------|------|----------|
| Vite dev server | 5000 | HTTP (with /api proxy to 3001) |
| Express backend | 3001 | HTTP |
| PostgreSQL (Neon) | 5432 | TCP (remote) |
| Polygon RPC (Alchemy) | 443 | HTTPS (remote) |

---

## 3. Production Risk List

### 3.1 CRITICAL

| # | Area | Risk | Detail | Mitigation |
|---|------|------|--------|------------|
| C1 | **Secrets** | Private keys in env vars | `OPERATOR_PRIVATE_KEY` and `DEPLOYER_PRIVATE_KEY` are raw hex private keys stored as environment variables. A single env leak exposes all on-chain funds. | Move to KMS (AWS/GCP) or hardware signer. Never log env vars. Rotate keys periodically. |
| C2 | **Auth** | CORS allowlist incomplete | CORS uses a custom `allowedOrigins` array built from `FRONTEND_URL` and `REPLIT_DOMAINS`. In non-production, any `.replit.dev` or `.repl.co` origin is accepted. Production must ensure `FRONTEND_URL` is set and the fallback wildcard paths are disabled. | Verify `FRONTEND_URL` is set in production. Remove `.replit.dev`/`.repl.co` wildcard in production builds. |
| C3 | **Uploads** | ~~Local disk storage~~ RESOLVED | New R2 storage abstraction (`server/storage/storage.ts`) with signed upload/download URLs. Legacy `multer` uploads still supported for backward compatibility. Routes: `POST /api/storage/issuance-docs/upload-url`, `GET /api/storage/issuance-docs/:docId/download-url`. | ~~Migrate to R2/S3 with signed URLs.~~ Done. Virus scanning still needed. |
| C4 | **Database** | ~~Migrations abandoned~~ RESOLVED | `npm run migrate` runs `prisma migrate deploy && prisma generate`. Deployment guide in `docs/DEPLOYMENT.md` documents local vs prod workflow. | ~~Reconcile migration history.~~ Done. Existing schema drift from `db push` era still needs baseline migration. |
| C5 | **Jobs** | ~~In-process cron~~ PARTIALLY RESOLVED | BullMQ worker (`server/worker.ts`) with 6 job processors and Redis queue. Cron jobs (`node-cron`) still run in-process for rent distribution and engagement scoring. | Move remaining cron jobs to BullMQ repeatable jobs. |
| C6 | **Logging** | ~~No structured logging~~ RESOLVED | Pino structured logger (`server/observability/logger.ts`), request ID middleware, centralized error handler. Admin system status at `GET /api/admin/system/status`. | ~~Adopt Pino.~~ Done. Migrate remaining `console.log` calls to logger. Ship to log aggregation service. |

### 3.2 HIGH

| # | Area | Risk | Detail | Mitigation |
|---|------|------|--------|------------|
| H1 | **Auth** | Webhook error handling | Stripe, Coinbase, and Sumsub webhooks all verify signatures, but error responses on verification failure vary (some return 400, others 500). Webhook secret env vars are required but not validated at startup. | Standardize webhook error responses. Validate required webhook secrets at startup. Add webhook event deduplication. |
| H2 | **Secrets** | No secret rotation | API keys for Stripe, Coinbase, Sumsub, Alchemy, and OpenAI are static. No rotation policy. | Document rotation procedures. Implement key versioning where possible. |
| H3 | **Database** | No connection pooling config | Prisma connects to Neon without explicit pool settings. Under load, connections may exhaust Neon's serverless limits. | Configure Prisma connection pool (`connection_limit`, `pool_timeout`). Use Neon's connection pooler endpoint. |
| H4 | **Auth** | Demo mode bypass | `isDemoMode()` returns mock data for all endpoints, bypassing auth checks and DB operations. If `DEMO_MODE=true` leaks to production, all APIs return fake data. | Add startup warning if `DEMO_MODE=true` and `NODE_ENV=production`. Gate demo mode behind explicit admin toggle, not env var alone. |
| H5 | **Rate limiting** | In-memory rate limiter | `express-rate-limit` uses `MemoryStore` by default. Resets on restart. Doesn't work across multiple replicas. | Use Redis-backed store for rate limiting in production. |
| H6 | **Blockchain** | No transaction retry/nonce management | `server/blockchain/evm.ts` sends transactions without nonce management or retry logic. Failed transactions aren't retried, and nonce gaps can stall the operator wallet. | Implement nonce manager, exponential backoff retry, and transaction receipt polling. |
| H7 | **Payments** | No idempotency on payment endpoints | Payment creation endpoints don't use idempotency keys. Double-clicks or retries can create duplicate charges. | Add Stripe idempotency keys. Implement client-side debouncing and server-side deduplication. |

### 3.3 MEDIUM

| # | Area | Risk | Detail | Mitigation |
|---|------|------|--------|------------|
| M1 | **Frontend** | No CSP headers | No Content-Security-Policy headers served. XSS vectors via CDN-loaded scripts (Font Awesome, Google Fonts). | Add CSP headers via Vite plugin or Express middleware. Use SRI hashes for CDN resources. |
| M2 | **API** | No request validation | Most endpoints trust `req.body` without schema validation. Malformed inputs can cause Prisma errors or unexpected behavior. | Add Zod or Joi validation schemas on all mutation endpoints. |
| M3 | **Database** | No soft deletes | Most models use `onDelete: Cascade`. Deleting a property removes all holdings, distributions, compliance data, governance, and tax documents. | Implement soft delete (`deletedAt` field) for critical models. |
| M4 | **Monitoring** | No health check depth | `/api/health` returns 200 without checking DB connectivity, Redis, or external service availability. | Add deep health check that verifies DB connection, Clerk, Stripe connectivity. |
| M5 | **Frontend** | No error boundaries | React app has no error boundaries. A single component crash can white-screen the entire app. | Add error boundaries at route and layout levels. |
| M6 | **Blockchain** | Testnet-only deployment | All contracts deployed on Polygon Amoy testnet. No mainnet deploy pipeline, no contract verification, no upgrade proxy pattern. | Implement deploy scripts with verification, use UUPS or transparent proxy for upgradeability. |
| M7 | **Uploads** | No file size enforcement at proxy level | multer enforces 10MB limit, but Vite proxy and Express body parser may accept larger payloads before multer rejects them. | Add upload size limits at the reverse proxy / CDN level. |
| M8 | **Auth** | Role stored in DB only | `User.role` is a DB field. No JWT claims carry the role, so every admin/tokenizer request requires a DB lookup via `loadUserWithRole`. | Consider embedding role in Clerk session claims to reduce DB round-trips. |

### 3.4 LOW

| # | Area | Risk | Detail | Mitigation |
|---|------|------|--------|------------|
| L1 | **DX** | No `.env.example` | New developers must reverse-engineer env vars from source. | Create `.env.example` with all required vars documented. |
| L2 | **Testing** | No automated test suite | No unit tests, no integration tests, no CI pipeline. | Add Jest/Vitest for backend, Playwright for E2E. Set up CI. |
| L3 | **Database** | No backup strategy documented | Neon provides point-in-time recovery, but no documented RTO/RPO targets. | Document backup/restore procedures. Test recovery quarterly. |
| L4 | **Frontend** | Bundle size not optimized | No code splitting beyond route-level lazy loading. All admin pages loaded by default. | Add React.lazy() for admin and tokenizer route groups. |
| L5 | **Compliance** | Audit trail gaps | `AuditEvent` model exists but not all mutations log events. Compliance-critical actions (evidence upload, KYC status changes) may not be audited. | Audit all state-changing operations on financial and compliance models. |

---

## Summary

**Architecture**: Monolithic Express + React SPA with Prisma/Neon PostgreSQL, on-chain Polygon contracts, and 6 external service integrations. Two in-process cron jobs. File uploads to local disk.

**Top 3 Actions Before Beta Launch (500 users):**
1. Fix CORS to restrict origins in production (C2)
2. Move file uploads to R2/S3 with signed URLs (C3)
3. Add structured logging with request correlation (C6)

**Top 3 Actions Before General Availability:**
1. Migrate to proper Prisma migrations with version control (C4)
2. Move cron jobs to external scheduler with idempotency (C5)
3. Implement KMS-backed key management for blockchain operations (C1)
