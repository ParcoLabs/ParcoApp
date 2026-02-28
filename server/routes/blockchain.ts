import { Router, Request, Response, NextFunction } from 'express';
import { validateAuth } from '../middleware/auth';
import { adminOnly, AuthenticatedRequest } from '../middleware/admin';
import prisma from '../lib/prisma';
import { isDemoMode, generateMockTxHash } from '../lib/demoMode';
import { enqueue, JOB_NAMES, QueueUnavailableError } from '../lib/queue';
import { logger } from '../observability';

const router = Router();

function generateDemoAddress(): string {
  const hex = Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return `0x${hex}`;
}

router.post(
  '/property/:propertyId/deploy',
  validateAuth,
  adminOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { propertyId } = req.params;
      const { name, symbol, allowlistRequired, lockupEndsAt } = req.body;
      const admin = (req as AuthenticatedRequest).user!;

      if (!name || !symbol) {
        return res.status(400).json({ error: 'name and symbol are required' });
      }

      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { onchainDeployment: true },
      });

      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }

      if (property.onchainDeployment) {
        return res.status(409).json({
          error: 'Property already has an on-chain deployment',
          deployment: property.onchainDeployment,
        });
      }

      if (isDemoMode()) {
        const tokenAddress = generateDemoAddress();
        const registryAddress = generateDemoAddress();
        const deployTxHash = generateMockTxHash();
        const registryTxHash = generateMockTxHash();

        const deployment = await prisma.onchainDeployment.create({
          data: {
            propertyId,
            chainId: 137,
            tokenAddress,
            registryAddress,
            deployedByUserId: admin.id,
            deployedAt: new Date(),
          },
        });

        return res.json({
          success: true,
          isDemo: true,
          deployment,
          txHashes: { deploy: deployTxHash, registry: registryTxHash },
        });
      }

      const idempotencyKey = `deploy:${propertyId}`;
      const payload = { name, symbol, allowlistRequired: allowlistRequired !== false, lockupEndsAt, propertyId };

      const actionRequest = await (prisma as any).blockchainActionRequest.create({
        data: {
          type: 'DEPLOY',
          propertyId,
          requestedById: admin.id,
          payload,
          status: 'PENDING',
          idempotencyKey,
        },
      });

      await prisma.auditEvent.create({
        data: {
          type: 'BLOCKCHAIN_ACTION_REQUESTED',
          entityId: actionRequest.id,
          userId: admin.id,
          metadata: { actionType: 'DEPLOY', propertyId, name, symbol },
        },
      });

      await enqueue(JOB_NAMES.BLOCKCHAIN_DEPLOY, {
        actionRequestId: actionRequest.id,
        ...payload,
        idempotencyKey,
      });

      logger.info({ actionRequestId: actionRequest.id, propertyId }, 'Blockchain deploy enqueued');

      return res.status(202).json({
        success: true,
        actionRequestId: actionRequest.id,
        status: 'PENDING',
        message: 'Deploy request submitted. Check action status for result.',
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/property/:propertyId/allowlist',
  validateAuth,
  adminOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { propertyId } = req.params;
      const { userId, walletAddress, allowed, reason } = req.body;
      const admin = (req as AuthenticatedRequest).user!;

      if (!userId && !walletAddress) {
        return res.status(400).json({ error: 'Either userId or walletAddress is required' });
      }

      if (typeof allowed !== 'boolean') {
        return res.status(400).json({ error: 'allowed (boolean) is required' });
      }

      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { onchainDeployment: true },
      });

      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }

      let targetUserId = userId;
      let resolvedWalletAddress = walletAddress;

      if (userId && !walletAddress) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, walletAddress: true },
        });
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        resolvedWalletAddress = user.walletAddress ?? null;
      }

      if (targetUserId) {
        await prisma.investorAllowlist.upsert({
          where: {
            propertyId_userId: { propertyId, userId: targetUserId },
          },
          create: {
            propertyId,
            userId: targetUserId,
            isAllowed: allowed,
            reason,
            addedByUserId: admin.id,
          },
          update: {
            isAllowed: allowed,
            reason,
            addedByUserId: admin.id,
          },
        });
      }

      if (isDemoMode()) {
        const txHash = resolvedWalletAddress && property.onchainDeployment?.registryAddress
          ? generateMockTxHash()
          : null;

        return res.json({
          success: true,
          isDemo: true,
          allowlistUpdated: !!targetUserId,
          onchainUpdated: !!txHash,
          txHash,
        });
      }

      const warnings: string[] = [];

      if (resolvedWalletAddress && property.onchainDeployment?.registryAddress) {
        const payload = {
          registryAddress: property.onchainDeployment.registryAddress,
          investorAddresses: [resolvedWalletAddress],
          allowed,
          propertyId,
        };

        const actionRequest = await (prisma as any).blockchainActionRequest.create({
          data: {
            type: 'ALLOWLIST',
            propertyId,
            requestedById: admin.id,
            payload,
            status: 'PENDING',
          },
        });

        await prisma.auditEvent.create({
          data: {
            type: 'BLOCKCHAIN_ACTION_REQUESTED',
            entityId: actionRequest.id,
            userId: admin.id,
            metadata: { actionType: 'ALLOWLIST', propertyId, wallet: resolvedWalletAddress, allowed },
          },
        });

        await enqueue(JOB_NAMES.BLOCKCHAIN_ALLOWLIST, {
          actionRequestId: actionRequest.id,
          ...payload,
        });

        logger.info({ actionRequestId: actionRequest.id, propertyId }, 'Blockchain allowlist enqueued');

        return res.status(202).json({
          success: true,
          actionRequestId: actionRequest.id,
          allowlistUpdated: !!targetUserId,
          status: 'PENDING',
          message: 'Allowlist update submitted.',
        });
      }

      if (!resolvedWalletAddress) {
        warnings.push('No wallet address available. On-chain allowlist was not updated.');
      }
      if (!property.onchainDeployment?.registryAddress) {
        warnings.push('No on-chain deployment found. Allowlist saved to database only.');
      }

      return res.json({
        success: true,
        allowlistUpdated: !!targetUserId,
        onchainUpdated: false,
        ...(warnings.length > 0 && { warnings }),
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/property/:propertyId/mint',
  validateAuth,
  adminOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { propertyId } = req.params;
      const { walletAddress, amountTokens } = req.body;
      const admin = (req as AuthenticatedRequest).user!;

      if (!walletAddress || !amountTokens) {
        return res.status(400).json({ error: 'walletAddress and amountTokens are required' });
      }

      if (typeof amountTokens !== 'number' || amountTokens <= 0) {
        return res.status(400).json({ error: 'amountTokens must be a positive number' });
      }

      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { onchainDeployment: true },
      });

      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }

      if (!property.onchainDeployment) {
        return res.status(400).json({ error: 'Property does not have an on-chain deployment. Deploy first.' });
      }

      if (isDemoMode()) {
        return res.json({
          success: true,
          isDemo: true,
          txHash: generateMockTxHash(),
          tokenAddress: property.onchainDeployment.tokenAddress,
          to: walletAddress,
          amount: amountTokens,
        });
      }

      const payload = {
        tokenAddress: property.onchainDeployment.tokenAddress,
        to: walletAddress,
        amount: amountTokens.toString(),
        propertyId,
      };

      const actionRequest = await (prisma as any).blockchainActionRequest.create({
        data: {
          type: 'MINT',
          propertyId,
          requestedById: admin.id,
          payload,
          status: 'PENDING',
        },
      });

      await prisma.auditEvent.create({
        data: {
          type: 'BLOCKCHAIN_ACTION_REQUESTED',
          entityId: actionRequest.id,
          userId: admin.id,
          metadata: { actionType: 'MINT', propertyId, to: walletAddress, amount: amountTokens },
        },
      });

      await enqueue(JOB_NAMES.BLOCKCHAIN_MINT, {
        actionRequestId: actionRequest.id,
        ...payload,
      });

      logger.info({ actionRequestId: actionRequest.id, propertyId }, 'Blockchain mint enqueued');

      return res.status(202).json({
        success: true,
        actionRequestId: actionRequest.id,
        status: 'PENDING',
        message: 'Mint request submitted. Check action status for result.',
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  '/action/:actionId',
  validateAuth,
  adminOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { actionId } = req.params;
      const action = await (prisma as any).blockchainActionRequest.findUnique({
        where: { id: actionId },
      });

      if (!action) {
        return res.status(404).json({ error: 'Action request not found' });
      }

      return res.json({ success: true, action });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
