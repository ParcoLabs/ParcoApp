# Parco — Deployment Guide

## Prerequisites

- Node.js 20+
- PostgreSQL (Neon serverless recommended)
- Redis (for BullMQ worker)
- Cloudflare R2 bucket (for document storage)

## Environment Variables

### Required

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require

VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Storage (R2)

```
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_BUCKET=parco-docs
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_REGION=auto
```

### Queue (Upstash Redis)

```
REDIS_URL=rediss://default:TOKEN@ENDPOINT.upstash.io:6379
```

If `REDIS_URL` is not set:
- **Local dev**: Jobs are processed inline (synchronously in the API process). No Redis required.
- **Production**: Enqueue endpoints return `412 Precondition Failed` with a clear error message.

### Blockchain (worker only)

```
RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/...
DEPLOYER_PRIVATE_KEY=0x...
SIGNER_PROVIDER=env-key
```

**Important**: `DEPLOYER_PRIVATE_KEY` should only be set on the worker process, never on the API server. The API creates `BlockchainActionRequest` records and enqueues jobs; the worker performs actual signing. See `docs/BLOCKCHAIN_OPS.md` for details.

### AI (optional)

```
AI_INTEGRATIONS_OPENAI_API_KEY=...
AI_INTEGRATIONS_OPENAI_BASE_URL=...
```

---

## Database: Neon PostgreSQL

### Initial Setup

1. Create a Neon project at https://console.neon.tech
2. Copy the connection string to `DATABASE_URL`
3. Run migrations:

```bash
npm run migrate
```

This runs `prisma migrate deploy && prisma generate`.

### Local Development

Use `prisma migrate dev` to create and apply migrations during development:

```bash
npx prisma migrate dev --name describe_your_change
```

This generates a migration file in `prisma/migrations/` and applies it.

### Production

**Never run `prisma migrate dev` or `prisma db push` in production.**

Production deployments use `prisma migrate deploy` which only applies existing, committed migration files:

```bash
npm run migrate
```

Run this as part of your deploy pipeline, before starting the API server.

### Migration Workflow

1. Make schema changes in `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name your_change` locally
3. Commit the generated migration files in `prisma/migrations/`
4. In production: `npm run migrate` applies pending migrations

---

## Build & Deploy

### Build

```bash
npm run build
```

Builds the Vite frontend and generates the Prisma client.

### Start API Server

```bash
npm run start:api
```

Runs the Express API in production mode. Serves the built frontend from `dist/`.

### Start Worker

```bash
npm run start:worker
```

Runs the BullMQ worker process. Processes async jobs: document extraction, report drafting, distribution prep, and blockchain operations.

### Full Deploy Sequence

```bash
npm install
npm run migrate
npm run build
npm run start:api &
npm run start:worker &
```

---

## Cloudflare R2 Setup

1. Create an R2 bucket in the Cloudflare dashboard
2. Create an API token with R2 read/write permissions
3. Set the environment variables:
   - `S3_ENDPOINT`: Your R2 endpoint (e.g., `https://<account-id>.r2.cloudflarestorage.com`)
   - `S3_BUCKET`: Bucket name
   - `S3_ACCESS_KEY_ID`: API token access key
   - `S3_SECRET_ACCESS_KEY`: API token secret key
   - `S3_REGION`: `auto` (default for R2)

### CORS Configuration

Add CORS rules to your R2 bucket to allow direct browser uploads:

```json
[
  {
    "AllowedOrigins": ["https://your-domain.com"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## Redis Setup

Required for the BullMQ worker process. Options:

- **Upstash Redis** (serverless, recommended for Replit)
- **Redis Cloud**
- **Self-hosted Redis**

Set `REDIS_URL` to your Redis connection string.

---

## Health Checks

- `GET /api/health` — Basic health check
- `GET /api/healthz` — Service health check
- `GET /api/admin/system/status` — Admin-only system status (DB, Redis, R2, LLM, blockchain)

---

## Process Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Vercel     │     │  Render API  │     │ Render Worker│
│  Frontend   │────▶│  parco-api   │────▶│ parco-worker │
│  (static)   │     │  port 3001   │     │              │
└─────────────┘     └──────┬───────┘     └──────┬───────┘
                           │                     │
                    ┌──────▼───────┐      ┌──────▼───────┐
                    │   Neon PG    │      │    Redis     │
                    │  (DATABASE)  │      │   (QUEUE)    │
                    └──────────────┘      └──────────────┘
                           │
                    ┌──────▼───────┐
                    │ Cloudflare   │
                    │  R2 Storage  │
                    └──────────────┘
```

---

## Deploy to Render (API + Worker)

Render uses the `render.yaml` blueprint at the repo root.

### Setup

1. Connect your GitHub/GitLab repo to Render
2. Render auto-detects `render.yaml` and creates two services:
   - **parco-api** (web service) — Express API + static frontend
   - **parco-worker** (background worker) — BullMQ job processor

### Environment Variables

Copy from `.env.render.api.example` and `.env.render.worker.example` into each service's environment settings in the Render dashboard.

Key differences:
- **API server**: Does NOT need `DEPLOYER_PRIVATE_KEY` or `RPC_URL`
- **Worker**: Needs `DEPLOYER_PRIVATE_KEY`, `RPC_URL`, and `SIGNER_PROVIDER`
- Both need `DATABASE_URL` and `REDIS_URL`

### Database Migration

After first deploy, run migrations via Render Shell or deploy hook:

```bash
npm run migrate
```

Render does not auto-run migrations. Add `npm run migrate` to the build command if desired:

```yaml
buildCommand: npm ci && npm run migrate && npm run build
```

### Health Check

The API service uses `/api/healthz` as its health check path. Render will restart the service if the health check fails.

---

## Deploy Frontend to Vercel

The frontend is a Vite SPA that can be deployed independently to Vercel.

### Setup

1. Import repo in Vercel dashboard
2. Set framework preset to **Vite**
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Set root directory: `.` (repo root)

### Environment Variables

Copy from `.env.vercel.example` into Vercel project settings:

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://parco-api.onrender.com` (your Render API URL) |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_...` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |

### SPA Routing

The `vercel.json` at the repo root handles SPA fallback rewrites. All non-API routes are rewritten to `index.html` for client-side routing.

### CORS

Set `FRONTEND_URL` on the Render API service to your Vercel domain:

```
FRONTEND_URL=https://your-app.vercel.app
```

### Notes

- The frontend uses `VITE_API_BASE_URL` to determine where to send API requests
- In development (Replit), this defaults to empty string (same-origin, using Vite proxy)
- In production (Vercel → Render), set it to the full Render API URL
- Clerk and Stripe publishable keys must be set in both Vercel and Render environments
