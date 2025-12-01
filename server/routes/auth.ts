import { Router, Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import { validateAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.post('/sync', validateAuth, async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    const clerkId = auth.userId;
    
    if (!clerkId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { email, firstName, lastName } = req.body;

    const user = await prisma.user.upsert({
      where: { clerkId },
      update: {
        email: email || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      },
      create: {
        clerkId,
        email: email || '',
        firstName: firstName || null,
        lastName: lastName || null,
      },
      include: {
        vaultAccount: true,
      },
    });

    if (!user.vaultAccount) {
      await prisma.vaultAccount.create({
        data: {
          userId: user.id,
        },
      });
    }

    console.log(`User synced: ${clerkId} (${user.email})`);

    return res.json({ 
      success: true, 
      user: {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        kycStatus: user.kycStatus,
      }
    });
  } catch (error) {
    console.error('Auth sync error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', validateAuth, async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    const clerkId = auth.userId;
    
    if (!clerkId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        vaultAccount: true,
        holdings: {
          include: {
            property: true,
          },
        },
        kycVerification: true,
      },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please sync first.' });
    }

    return res.json({ 
      user: {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        kycStatus: user.kycStatus,
        kycVerification: user.kycVerification,
        vaultAccount: user.vaultAccount ? {
          id: user.vaultAccount.id,
          usdcBalance: user.vaultAccount.usdcBalance,
          lockedBalance: user.vaultAccount.lockedBalance,
          walletAddress: user.vaultAccount.walletAddress,
        } : null,
        holdings: user.holdings.map(h => ({
          id: h.id,
          propertyId: h.propertyId,
          propertyName: h.property.name,
          quantity: h.quantity,
          totalInvested: h.totalInvested,
          rentEarned: h.rentEarned,
        })),
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
