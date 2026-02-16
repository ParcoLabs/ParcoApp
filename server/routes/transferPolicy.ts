import { Router, Request, Response } from 'express';
import { validateAuth } from '../middleware/auth';
import { adminOnly, AuthenticatedRequest } from '../middleware/admin';
import prisma from '../lib/prisma';
import { isDemoMode, generateMockTxHash } from '../lib/demoMode';
import {
  tokenSetAllowlistRequired,
  tokenSetLockupEndsAt,
  BlockchainConfigError,
} from '../services/blockchain';

const router = Router();

router.get('/:propertyId/transfer-policy', validateAuth, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, name: true },
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const policy = await prisma.transferPolicy.findUnique({
      where: { propertyId },
    });

    const deployment = await prisma.onchainDeployment.findUnique({
      where: { propertyId },
      select: { tokenAddress: true, registryAddress: true },
    });

    return res.json({
      success: true,
      policy: policy || null,
      hasOnchainDeployment: !!deployment,
    });
  } catch (error) {
    console.error('[TransferPolicy] GET error:', error);
    return res.status(500).json({ error: 'Failed to fetch transfer policy' });
  }
});

router.post('/:propertyId/transfer-policy', validateAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const { type, lockupEndsAt, maxHolders, maxPerInvestorCents, notes } = req.body;
    const admin = (req as AuthenticatedRequest).user!;

    const validTypes = ['UNRESTRICTED', 'ALLOWLIST_ONLY', 'ALLOWLIST_AND_LOCKUP', 'REG_D_12M_LOCKUP', 'CUSTOM'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    }

    if (['ALLOWLIST_AND_LOCKUP', 'REG_D_12M_LOCKUP'].includes(type) && !lockupEndsAt) {
      return res.status(400).json({ error: 'lockupEndsAt is required for lockup-based policies' });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, name: true },
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const oldPolicy = await prisma.transferPolicy.findUnique({
      where: { propertyId },
    });

    const policy = await prisma.transferPolicy.upsert({
      where: { propertyId },
      create: {
        propertyId,
        type,
        lockupEndsAt: lockupEndsAt ? new Date(lockupEndsAt) : null,
        maxHolders: maxHolders ?? null,
        maxPerInvestorCents: maxPerInvestorCents ?? null,
        notes: notes ?? null,
      },
      update: {
        type,
        lockupEndsAt: lockupEndsAt ? new Date(lockupEndsAt) : null,
        maxHolders: maxHolders ?? null,
        maxPerInvestorCents: maxPerInvestorCents ?? null,
        notes: notes ?? null,
      },
    });

    await prisma.auditEvent.create({
      data: {
        type: 'TRANSFER_POLICY_UPDATED',
        entityId: propertyId,
        userId: admin.id,
        oldValue: oldPolicy ? { type: oldPolicy.type, lockupEndsAt: oldPolicy.lockupEndsAt } : null,
        newValue: { type: policy.type, lockupEndsAt: policy.lockupEndsAt },
        metadata: { propertyName: property.name, notes },
      },
    });

    const deployment = await prisma.onchainDeployment.findUnique({
      where: { propertyId },
      select: { tokenAddress: true, registryAddress: true },
    });

    const warnings: string[] = [];
    const txHashes: string[] = [];

    if (deployment?.tokenAddress) {
      const allowlistRequired = type !== 'UNRESTRICTED';
      const lockupTimestamp = lockupEndsAt ? Math.floor(new Date(lockupEndsAt).getTime() / 1000) : 0;

      if (isDemoMode()) {
        txHashes.push(generateMockTxHash());
        if (['ALLOWLIST_AND_LOCKUP', 'REG_D_12M_LOCKUP'].includes(type)) {
          txHashes.push(generateMockTxHash());
        }
      } else {
        try {
          const hash1 = await tokenSetAllowlistRequired({
            tokenAddress: deployment.tokenAddress,
            required: allowlistRequired,
          });
          txHashes.push(hash1);

          if (['ALLOWLIST_AND_LOCKUP', 'REG_D_12M_LOCKUP'].includes(type) && lockupTimestamp > 0) {
            const hash2 = await tokenSetLockupEndsAt({
              tokenAddress: deployment.tokenAddress,
              lockupEndsAt: lockupTimestamp,
            });
            txHashes.push(hash2);
          } else if (type === 'ALLOWLIST_ONLY' || type === 'UNRESTRICTED') {
            const hash2 = await tokenSetLockupEndsAt({
              tokenAddress: deployment.tokenAddress,
              lockupEndsAt: 0,
            });
            txHashes.push(hash2);
          }
        } catch (err) {
          if (err instanceof BlockchainConfigError) {
            warnings.push(err.message);
          } else {
            warnings.push(`On-chain sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      }
    } else {
      warnings.push('No on-chain deployment found. Policy saved to database only.');
    }

    return res.json({
      success: true,
      isDemo: isDemoMode(),
      policy,
      onchainSynced: txHashes.length > 0,
      txHashes: txHashes.length > 0 ? txHashes : undefined,
      ...(warnings.length > 0 && { warnings }),
    });
  } catch (error) {
    console.error('[TransferPolicy] POST error:', error);
    return res.status(500).json({ error: 'Failed to save transfer policy' });
  }
});

export default router;
