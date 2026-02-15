import { Router, Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import prisma from '../lib/prisma';
import { isDemoMode } from '../utils/demoMode';
import { mockIssuanceCase } from '../utils/demoResponses';
import { loadUserWithRole, AuthenticatedRequest } from '../middleware/admin';

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
    console.error('[issuance simpleAuth] Error:', error);
    return res.status(401).json({ success: false, error: 'Authentication failed' });
  }
};

router.get(
  '/by-submission/:submissionId',
  simpleAuth,
  loadUserWithRole,
  async (req: Request, res: Response) => {
    try {
      const { submissionId } = req.params;
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (isDemoMode(req)) {
        return res.json({
          success: true,
          data: mockIssuanceCase({ id: `demo_${submissionId}`, propertyId: submissionId }),
        });
      }

      const submission = await prisma.tokenizationSubmission.findUnique({
        where: { id: submissionId },
        select: { id: true, tokenizerId: true },
      });

      if (!submission) {
        return res.status(404).json({ success: false, error: 'Submission not found' });
      }

      if (user.role !== 'ADMIN' && submission.tokenizerId !== user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const issuanceCase = await prisma.issuanceCase.findUnique({
        where: { submissionId },
        include: { submission: true },
      });

      if (!issuanceCase) {
        return res.status(404).json({ success: false, error: 'No issuance case found for this submission' });
      }

      return res.json({ success: true, data: issuanceCase });
    } catch (error: any) {
      console.error('[issuance] Error fetching case:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/by-submission/:submissionId/create',
  simpleAuth,
  loadUserWithRole,
  async (req: Request, res: Response) => {
    try {
      const { submissionId } = req.params;
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (isDemoMode(req)) {
        return res.json({
          success: true,
          data: mockIssuanceCase({
            id: `demo_${submissionId}`,
            propertyId: submissionId,
            status: 'INTAKE_COMPLETE',
          }),
        });
      }

      const submission = await prisma.tokenizationSubmission.findUnique({
        where: { id: submissionId },
        select: { id: true, tokenizerId: true },
      });

      if (!submission) {
        return res.status(404).json({ success: false, error: 'Submission not found' });
      }

      if (user.role !== 'ADMIN' && submission.tokenizerId !== user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const existing = await prisma.issuanceCase.findUnique({
        where: { submissionId },
      });

      if (existing) {
        return res.json({ success: true, data: existing });
      }

      const issuanceCase = await prisma.issuanceCase.create({
        data: {
          submissionId,
          status: 'INTAKE_COMPLETE',
          eligibilityStatus: 'PENDING',
        },
      });

      return res.status(201).json({ success: true, data: issuanceCase });
    } catch (error: any) {
      console.error('[issuance] Error creating case:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

export default router;
