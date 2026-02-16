import { Router, Request, Response } from 'express';
import { validateAuth } from '../middleware/auth';
import { adminOnly, AuthenticatedRequest } from '../middleware/admin';
import prisma from '../lib/prisma';
import { isDemoMode, generateMockTxHash } from '../lib/demoMode';
import {
  deployRestrictedToken,
  registrySetAllowed,
  tokenMint,
  BlockchainConfigError,
} from '../services/blockchain';

const router = Router();

function handleBlockchainError(res: Response, error: unknown) {
  if (error instanceof BlockchainConfigError) {
    return res.status(412).json({ error: error.message });
  }
  console.error('[Blockchain] Error:', error);
  return res.status(500).json({
    error: error instanceof Error ? error.message : 'Blockchain operation failed',
  });
}

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
  async (req: Request, res: Response) => {
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

      let tokenAddress: string;
      let registryAddress: string;
      let deployTxHash: string;
      let registryTxHash: string;

      if (isDemoMode()) {
        tokenAddress = generateDemoAddress();
        registryAddress = generateDemoAddress();
        deployTxHash = generateMockTxHash();
        registryTxHash = generateMockTxHash();
      } else {
        try {
          const result = await deployRestrictedToken({
            name,
            symbol,
            allowlistRequired: allowlistRequired !== false,
            lockupEndsAt,
          });
          tokenAddress = result.tokenAddress;
          registryAddress = result.registryAddress;
          deployTxHash = result.deployTxHash;
          registryTxHash = result.registryTxHash;
        } catch (err) {
          return handleBlockchainError(res, err);
        }
      }

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
        isDemo: isDemoMode(),
        deployment,
        txHashes: { deploy: deployTxHash, registry: registryTxHash },
      });
    } catch (error) {
      return handleBlockchainError(res, error);
    }
  }
);

router.post(
  '/property/:propertyId/allowlist',
  validateAuth,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const { userId, walletAddress, allowed, reason } = req.body;
      const admin = (req as AuthenticatedRequest).user!;

      if (!userId && !walletAddress) {
        return res
          .status(400)
          .json({ error: 'Either userId or walletAddress is required' });
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

      let txHash: string | null = null;

      if (resolvedWalletAddress && property.onchainDeployment?.registryAddress) {
        if (isDemoMode()) {
          txHash = generateMockTxHash();
        } else {
          try {
            txHash = await registrySetAllowed({
              registryAddress: property.onchainDeployment.registryAddress,
              investorAddress: resolvedWalletAddress,
              allowed,
            });
          } catch (err) {
            return handleBlockchainError(res, err);
          }
        }
      }

      const warnings: string[] = [];
      if (resolvedWalletAddress && !property.onchainDeployment?.registryAddress) {
        warnings.push('No on-chain deployment found for this property. Allowlist was saved to database only.');
      }
      if (!resolvedWalletAddress && property.onchainDeployment?.registryAddress) {
        warnings.push('No wallet address available. On-chain allowlist was not updated.');
      }

      return res.json({
        success: true,
        isDemo: isDemoMode(),
        allowlistUpdated: !!targetUserId,
        onchainUpdated: !!txHash,
        txHash,
        ...(warnings.length > 0 && { warnings }),
      });
    } catch (error) {
      return handleBlockchainError(res, error);
    }
  }
);

router.post(
  '/property/:propertyId/mint',
  validateAuth,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const { walletAddress, amountTokens } = req.body;

      if (!walletAddress || !amountTokens) {
        return res
          .status(400)
          .json({ error: 'walletAddress and amountTokens are required' });
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
        return res
          .status(400)
          .json({ error: 'Property does not have an on-chain deployment. Deploy first.' });
      }

      let txHash: string;

      if (isDemoMode()) {
        txHash = generateMockTxHash();
      } else {
        try {
          txHash = await tokenMint({
            tokenAddress: property.onchainDeployment.tokenAddress,
            to: walletAddress,
            amount: amountTokens.toString(),
          });
        } catch (err) {
          return handleBlockchainError(res, err);
        }
      }

      return res.json({
        success: true,
        isDemo: isDemoMode(),
        txHash,
        tokenAddress: property.onchainDeployment.tokenAddress,
        to: walletAddress,
        amount: amountTokens,
      });
    } catch (error) {
      return handleBlockchainError(res, error);
    }
  }
);

export default router;
