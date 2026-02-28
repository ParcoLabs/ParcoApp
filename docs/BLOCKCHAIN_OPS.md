# Parco — Blockchain Operations Guide

## Architecture

Blockchain signing is **never** performed in the API process. The API creates a `BlockchainActionRequest` record and enqueues a BullMQ job. The worker process picks up the job, performs the on-chain transaction, and writes the result back to the database.

```
┌───────────┐     ┌──────────────────────────┐     ┌──────────────┐
│  Admin UI │────▶│  Express API             │────▶│ BullMQ Queue │
│           │     │  Creates action request   │     │  (Redis)     │
└───────────┘     │  Enqueues job             │     └──────┬───────┘
                  └──────────────────────────┘            │
                                                   ┌──────▼───────┐
                                                   │ Worker       │
                                                   │ Signs tx     │
                                                   │ Updates DB   │
                                                   └──────┬───────┘
                                                          │
                                                   ┌──────▼───────┐
                                                   │ Blockchain   │
                                                   │ (Polygon)    │
                                                   └──────────────┘
```

## BlockchainActionRequest Model

```prisma
model BlockchainActionRequest {
  id              String   @id @default(cuid())
  type            String       // DEPLOY, ALLOWLIST, MINT
  propertyId      String?
  requestedById   String?
  payload         Json         // Action-specific parameters
  status          String       // PENDING -> PROCESSING -> COMPLETED | FAILED
  result          Json?        // On-chain result (addresses, tx hashes)
  error           String?      // Error message if failed
  idempotencyKey  String?  @unique
  createdAt       DateTime
  updatedAt       DateTime
  completedAt     DateTime?
}
```

### Status Lifecycle

```
PENDING → PROCESSING → COMPLETED
                     → FAILED
```

- **PENDING**: Created by API, waiting for worker pickup
- **PROCESSING**: Worker has picked up the job, signing in progress
- **COMPLETED**: Transaction confirmed on-chain
- **FAILED**: Transaction or signing failed (see `error` field)

## Action Types

### BLOCKCHAIN_DEPLOY

Deploys AllowlistRegistry + RestrictedToken contracts for a property.

**Payload:**
```json
{
  "name": "Property Token",
  "symbol": "PROP",
  "allowlistRequired": true,
  "lockupEndsAt": null
}
```

**Result:**
```json
{
  "tokenAddress": "0x...",
  "registryAddress": "0x...",
  "deployTxHash": "0x...",
  "registryTxHash": "0x..."
}
```

### BLOCKCHAIN_ALLOWLIST

Updates investor allowlist on AllowlistRegistry contract.

**Payload:**
```json
{
  "registryAddress": "0x...",
  "investorAddresses": ["0x..."],
  "allowed": true
}
```

**Result:**
```json
{
  "txHash": "0x..."
}
```

### BLOCKCHAIN_MINT

Mints tokens to an investor wallet via RestrictedToken contract.

**Payload:**
```json
{
  "tokenAddress": "0x...",
  "to": "0x...",
  "amount": "100"
}
```

**Result:**
```json
{
  "txHash": "0x..."
}
```

## Signing Architecture

The worker uses a pluggable `SignerProvider` interface (`server/services/signer.ts`):

```typescript
interface SignerProvider {
  name: string;
  getWallet(provider: JsonRpcProvider): Wallet | Promise<Wallet>;
}
```

### Available Providers

| Provider | Env Var | Status |
|----------|---------|--------|
| `env-key` | `DEPLOYER_PRIVATE_KEY` | Active (default) |
| `kms` | — | Scaffold only |
| `fireblocks` | — | Scaffold only |

Set `SIGNER_PROVIDER=env-key` (default) or future providers via environment variable.

### Security Notes

- `DEPLOYER_PRIVATE_KEY` should **only** be set in the worker environment, never in the API server
- The API server does not need access to any private keys
- All blockchain actions are audited via `AuditEvent` records
- Each action request has an optional `idempotencyKey` to prevent duplicate transactions

## Audit Trail

Every blockchain action creates two audit records:

1. **Request creation** (`BLOCKCHAIN_ACTION_REQUESTED`): Logged when the API creates the action request
2. **Action completion** (`BLOCKCHAIN_ACTION_COMPLETED` or `BLOCKCHAIN_ACTION_FAILED`): Logged by the worker when the action finishes

Audit events include:
- `entityId`: The `BlockchainActionRequest.id`
- `userId`: The admin who requested the action
- `metadata`: Action type, property ID, and relevant details

## Environment Variables

### API Server
```
DATABASE_URL=...
REDIS_URL=...
# NO blockchain keys needed
```

### Worker
```
DATABASE_URL=...
REDIS_URL=...
RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/...
DEPLOYER_PRIVATE_KEY=0x...
SIGNER_PROVIDER=env-key
```

## Monitoring

Query pending/failed actions:
```sql
SELECT * FROM "BlockchainActionRequest"
WHERE status = 'FAILED'
ORDER BY "createdAt" DESC;
```

Check action queue depth:
```sql
SELECT status, COUNT(*)
FROM "BlockchainActionRequest"
GROUP BY status;
```

## Future: KMS Integration

To integrate AWS KMS:

1. Implement `KMSPlaceholderSigner.getWallet()` in `server/services/signer.ts`
2. Use `@aws-sdk/client-kms` to sign transaction digests
3. Wrap in an ethers.js-compatible signer
4. Set `SIGNER_PROVIDER=kms` and configure KMS key ARN

To integrate Fireblocks:

1. Implement `FireblocksPlaceholderSigner.getWallet()` in `server/services/signer.ts`
2. Use `@fireblocks/fireblocks-web3-provider`
3. Set `SIGNER_PROVIDER=fireblocks` and configure Fireblocks API credentials
