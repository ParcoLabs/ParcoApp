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

### Worker (BullMQ)

```
REDIS_URL=redis://user:pass@host:6379
```

### Blockchain (optional)

```
ALCHEMY_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/...
OPERATOR_PRIVATE_KEY=0x...
DEPLOYER_PRIVATE_KEY=0x...
POLYGON_NETWORK=mainnet
```

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
│  Vite Build │     │  Express API │     │ BullMQ Worker│
│  (static)   │────▶│  start:api   │────▶│ start:worker │
│  dist/      │     │  port 3001   │     │              │
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
