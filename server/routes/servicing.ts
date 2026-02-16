import { Router, Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import prisma from '../lib/prisma';
import { isDemoMode } from '../utils/demoMode';
import { loadUserWithRole, adminOnly, AuthenticatedRequest } from '../middleware/admin';
import { applyCompliancePack, mockComplianceRequirements } from '../services/compliancePack';

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
    console.error('[servicing simpleAuth] Error:', error);
    return res.status(401).json({ success: false, error: 'Authentication failed' });
  }
};

router.get(
  '/property/:propertyId/compliance',
  simpleAuth,
  loadUserWithRole,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const user = (req as AuthenticatedRequest).user;

      if (isDemoMode(req)) {
        return res.json({
          success: true,
          data: mockComplianceRequirements(propertyId),
        });
      }

      const isAdmin = user?.role === 'ADMIN';
      if (!isAdmin) {
        const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { ownerId: true } });
        if (!property || property.ownerId !== user?.clerkUserId) {
          return res.status(403).json({ success: false, error: 'Forbidden' });
        }
      }

      const requirements = await prisma.complianceRequirement.findMany({
        where: { propertyId },
        include: { evidence: true },
        orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
      });

      return res.json({ success: true, data: requirements });
    } catch (error: any) {
      console.error('[servicing] Error fetching compliance:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/property/:propertyId/compliance/apply',
  simpleAuth,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const { caseId } = req.body;

      if (!caseId) {
        return res.status(400).json({ success: false, error: 'caseId is required' });
      }

      if (isDemoMode(req)) {
        return res.json({
          success: true,
          data: {
            propertyId,
            caseId,
            track: 'SERIES_LLC',
            requirementsCreated: 3,
            totalRequirements: 3,
          },
        });
      }

      const result = await applyCompliancePack(caseId, propertyId);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[servicing] Error applying compliance pack:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/compliance/:id/complete',
  simpleAuth,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      if (isDemoMode(req)) {
        return res.json({
          success: true,
          data: { id, status: 'COMPLETED', notes: notes || null },
        });
      }

      const updated = await prisma.complianceRequirement.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          notes: notes || undefined,
        },
        include: { evidence: true },
      });

      return res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[servicing] Error completing compliance:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/compliance/:id/evidence',
  simpleAuth,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, url } = req.body;
      const user = (req as AuthenticatedRequest).user;

      if (!name || !url) {
        return res.status(400).json({ success: false, error: 'name and url are required' });
      }

      if (isDemoMode(req)) {
        return res.json({
          success: true,
          data: {
            id: `demo_ev_${Date.now()}`,
            requirementId: id,
            name,
            url,
            uploadedByUserId: user?.id || null,
            createdAt: new Date().toISOString(),
          },
        });
      }

      const evidence = await prisma.complianceEvidence.create({
        data: {
          requirementId: id,
          name,
          url,
          uploadedByUserId: user?.id || null,
        },
      });

      return res.json({ success: true, data: evidence });
    } catch (error: any) {
      console.error('[servicing] Error adding evidence:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

export default router;
