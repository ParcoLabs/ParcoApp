import { Router, Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import prisma from '../lib/prisma';
import { isDemoMode } from '../utils/demoMode';
import { loadUserWithRole, adminOnly, AuthenticatedRequest } from '../middleware/admin';

const router = Router();

const simpleAuth = async (req: Request, res: Response, next: Function) => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    (req as any).auth = auth;
    next();
  } catch (error) {
    console.error('[compliance simpleAuth] Error:', error);
    return res.status(401).json({ success: false, error: 'Authentication failed' });
  }
};

const investorProfile = (prisma as any).investorProfile;

async function ensureInvestorProfile(userId: string) {
  let profile = await investorProfile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await investorProfile.create({
      data: { userId },
    });
  }
  return profile;
}

router.get(
  '/status',
  simpleAuth,
  loadUserWithRole,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const profile = await ensureInvestorProfile(user.id);

      return res.json({
        success: true,
        data: {
          kycStatus: profile.kycStatus,
          accreditationStatus: profile.accreditationStatus,
          lastKycCheckAt: profile.lastKycCheckAt,
          country: profile.country,
          state: profile.state,
        },
      });
    } catch (error: any) {
      console.error('[compliance] Error fetching status:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/kyc/start',
  simpleAuth,
  loadUserWithRole,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const profile = await ensureInvestorProfile(user.id);

      if (profile.kycStatus === 'APPROVED') {
        return res.json({
          success: true,
          message: 'KYC already approved',
          data: { kycStatus: 'APPROVED' },
        });
      }

      await investorProfile.update({
        where: { userId: user.id },
        data: { kycStatus: 'PENDING' },
      });

      const redirectUrl = isDemoMode(req)
        ? '/settings?kyc=demo-pending'
        : null;

      console.log(`[compliance] KYC started for user ${user.id}`);

      return res.json({
        success: true,
        data: {
          kycStatus: 'PENDING',
          redirectUrl,
          instructions: 'KYC verification initiated. You will be notified when verification is complete.',
          provider: 'stub',
        },
      });
    } catch (error: any) {
      console.error('[compliance] Error starting KYC:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/kyc/webhook',
  async (req: Request, res: Response) => {
    try {
      const webhookSecret = process.env.COMPLIANCE_WEBHOOK_SECRET;
      if (webhookSecret) {
        const signature = req.headers['x-webhook-signature'] || req.headers['x-compliance-signature'];
        if (signature !== webhookSecret) {
          return res.status(403).json({ success: false, error: 'Invalid webhook signature' });
        }
      }

      const { userId, status, providerData } = req.body;

      if (!userId || !status) {
        return res.status(400).json({ success: false, error: 'userId and status are required' });
      }

      const validStatuses = ['APPROVED', 'REJECTED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: `status must be one of: ${validStatuses.join(', ')}` });
      }

      const profile = await investorProfile.findUnique({ where: { userId } });
      if (!profile) {
        return res.status(404).json({ success: false, error: 'Investor profile not found' });
      }

      await investorProfile.update({
        where: { userId },
        data: {
          kycStatus: status,
          lastKycCheckAt: new Date(),
        },
      });

      await prisma.auditEvent.create({
        data: {
          type: 'KYC_STATUS_UPDATED',
          entityId: userId,
          userId,
          oldValue: { kycStatus: profile.kycStatus },
          newValue: { kycStatus: status, provider: providerData?.provider || 'webhook' },
        },
      });

      console.log(`[compliance] KYC webhook: user ${userId} status => ${status}`);

      return res.json({ success: true, data: { kycStatus: status } });
    } catch (error: any) {
      console.error('[compliance] KYC webhook error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/accreditation/start',
  simpleAuth,
  loadUserWithRole,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const profile = await ensureInvestorProfile(user.id);

      if (profile.accreditationStatus === 'APPROVED') {
        return res.json({
          success: true,
          message: 'Accreditation already verified',
          data: { accreditationStatus: 'APPROVED' },
        });
      }

      await investorProfile.update({
        where: { userId: user.id },
        data: { accreditationStatus: 'PENDING' },
      });

      console.log(`[compliance] Accreditation started for user ${user.id}`);

      return res.json({
        success: true,
        data: {
          accreditationStatus: 'PENDING',
          instructions: 'Accreditation verification initiated. Submit proof of accredited investor status.',
          provider: 'stub',
        },
      });
    } catch (error: any) {
      console.error('[compliance] Error starting accreditation:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/accreditation/webhook',
  async (req: Request, res: Response) => {
    try {
      const webhookSecret = process.env.COMPLIANCE_WEBHOOK_SECRET;
      if (webhookSecret) {
        const signature = req.headers['x-webhook-signature'] || req.headers['x-compliance-signature'];
        if (signature !== webhookSecret) {
          return res.status(403).json({ success: false, error: 'Invalid webhook signature' });
        }
      }

      const { userId, status, providerData } = req.body;

      if (!userId || !status) {
        return res.status(400).json({ success: false, error: 'userId and status are required' });
      }

      const validStatuses = ['APPROVED', 'REJECTED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: `status must be one of: ${validStatuses.join(', ')}` });
      }

      const profile = await investorProfile.findUnique({ where: { userId } });
      if (!profile) {
        return res.status(404).json({ success: false, error: 'Investor profile not found' });
      }

      await investorProfile.update({
        where: { userId },
        data: { accreditationStatus: status },
      });

      await prisma.auditEvent.create({
        data: {
          type: 'ACCREDITATION_STATUS_UPDATED',
          entityId: userId,
          userId,
          oldValue: { accreditationStatus: profile.accreditationStatus },
          newValue: { accreditationStatus: status, provider: providerData?.provider || 'webhook' },
        },
      });

      console.log(`[compliance] Accreditation webhook: user ${userId} status => ${status}`);

      return res.json({ success: true, data: { accreditationStatus: status } });
    } catch (error: any) {
      console.error('[compliance] Accreditation webhook error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/demo/toggle',
  simpleAuth,
  loadUserWithRole,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      if (!isDemoMode(req)) {
        return res.status(400).json({ success: false, error: 'Demo mode is not enabled' });
      }

      const { kycStatus, accreditationStatus } = req.body;
      const profile = await ensureInvestorProfile(user.id);

      const updateData: any = {};
      if (kycStatus && ['NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED'].includes(kycStatus)) {
        updateData.kycStatus = kycStatus;
      }
      if (accreditationStatus && ['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED'].includes(accreditationStatus)) {
        updateData.accreditationStatus = accreditationStatus;
      }
      if (kycStatus === 'APPROVED') {
        updateData.lastKycCheckAt = new Date();
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, error: 'No valid status fields provided' });
      }

      const updated = await investorProfile.update({
        where: { userId: user.id },
        data: updateData,
      });

      return res.json({
        success: true,
        data: {
          kycStatus: updated.kycStatus,
          accreditationStatus: updated.accreditationStatus,
        },
      });
    } catch (error: any) {
      console.error('[compliance] Error toggling demo status:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

export function checkAccreditedInvestor(profile: { accreditationStatus: string } | null): {
  allowed: boolean;
  reason?: string;
} {
  if (!profile) {
    return { allowed: false, reason: 'No investor profile found. Complete KYC first.' };
  }
  if (profile.accreditationStatus !== 'APPROVED') {
    return { allowed: false, reason: `Accreditation status is ${profile.accreditationStatus}. Must be APPROVED for Reg D investments.` };
  }
  return { allowed: true };
}

export default router;
