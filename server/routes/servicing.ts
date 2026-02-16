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
        if (!property || property.ownerId !== user?.clerkId) {
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

router.post(
  '/property/:propertyId/captable/snapshot',
  simpleAuth,
  loadUserWithRole,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const demo = isDemoMode(req);

      if (demo) {
        const demoHolders = [
          { userId: 'demo_user_1', name: 'Alice Johnson', tokens: 150, percentage: '30.00' },
          { userId: 'demo_user_2', name: 'Bob Smith', tokens: 100, percentage: '20.00' },
          { userId: 'demo_user_3', name: 'Carol Williams', tokens: 75, percentage: '15.00' },
          { userId: 'demo_user_4', name: 'Dave Brown', tokens: 50, percentage: '10.00' },
          { userId: 'demo_user_5', name: 'Eve Davis', tokens: 125, percentage: '25.00' },
        ];
        const snapshot = {
          id: `demo_snap_${Date.now()}`,
          propertyId,
          asOf: new Date().toISOString(),
          totalHolders: demoHolders.length,
          totalSupply: '500',
          data: { holders: demoHolders },
          createdAt: new Date().toISOString(),
        };
        return res.json({ success: true, data: snapshot });
      }

      const property = await (prisma.property as any).findUnique({
        where: { id: propertyId },
        include: {
          holdings: {
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
          },
          token: true,
          onchainDeployment: true,
        },
      });

      if (!property) {
        return res.status(404).json({ success: false, error: 'Property not found' });
      }

      const holders = property.holdings.map((h: any) => ({
        userId: h.userId,
        name: `${h.user.firstName || ''} ${h.user.lastName || ''}`.trim() || h.user.email,
        tokens: h.quantity,
        averageCost: h.averageCost.toString(),
        totalInvested: h.totalInvested.toString(),
        percentage: property.totalTokens > 0
          ? ((h.quantity / property.totalTokens) * 100).toFixed(2)
          : '0.00',
      }));

      const totalSupply = property.totalTokens.toString();
      const totalHolders = holders.length;

      const snapshot = await (prisma as any).capTableSnapshot.create({
        data: {
          propertyId,
          asOf: new Date(),
          totalHolders,
          totalSupply,
          data: { holders },
        },
      });

      return res.json({ success: true, data: snapshot });
    } catch (error: any) {
      console.error('[servicing] Error creating cap table snapshot:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.get(
  '/property/:propertyId/captable/snapshots',
  simpleAuth,
  loadUserWithRole,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;

      if (isDemoMode(req)) {
        const now = new Date();
        const demoSnapshots = [
          {
            id: 'demo_snap_1',
            propertyId,
            asOf: new Date(now.getTime() - 7 * 86400000).toISOString(),
            totalHolders: 4,
            totalSupply: '400',
            createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
          },
          {
            id: 'demo_snap_2',
            propertyId,
            asOf: new Date(now.getTime() - 1 * 86400000).toISOString(),
            totalHolders: 5,
            totalSupply: '500',
            createdAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
          },
        ];
        return res.json({ success: true, data: demoSnapshots });
      }

      const snapshots = await (prisma as any).capTableSnapshot.findMany({
        where: { propertyId },
        orderBy: { asOf: 'desc' },
        take: 20,
        select: { id: true, propertyId: true, asOf: true, totalHolders: true, totalSupply: true, createdAt: true },
      });

      return res.json({ success: true, data: snapshots });
    } catch (error: any) {
      console.error('[servicing] Error listing snapshots:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.post(
  '/property/:propertyId/statements/generate',
  simpleAuth,
  loadUserWithRole,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const demo = isDemoMode(req);

      const now = new Date();
      const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);

      if (demo) {
        const demoStatements = [
          { userId: 'demo_user_1', name: 'Alice Johnson', tokens: 150, rent: 375.00 },
          { userId: 'demo_user_2', name: 'Bob Smith', tokens: 100, rent: 250.00 },
          { userId: 'demo_user_3', name: 'Carol Williams', tokens: 75, rent: 187.50 },
        ].map((inv, i) => ({
          id: `demo_stmt_${Date.now()}_${i}`,
          userId: inv.userId,
          propertyId,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          statementText: [
            `INVESTOR STATEMENT — ${periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
            `Investor: ${inv.name}`,
            `Property: Demo Property`,
            `Tokens Held: ${inv.tokens}`,
            `Period: ${periodStart.toLocaleDateString()} – ${periodEnd.toLocaleDateString()}`,
            `Rent Distribution: $${inv.rent.toFixed(2)}`,
            `Status: Distributed`,
            `---`,
            `This statement is for informational purposes only and does not constitute tax or legal advice.`,
          ].join('\n'),
          createdAt: now.toISOString(),
        }));
        return res.json({ success: true, data: { count: demoStatements.length, statements: demoStatements } });
      }

      const property = await (prisma.property as any).findUnique({
        where: { id: propertyId },
        include: {
          holdings: {
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
          },
        },
      });

      if (!property) {
        return res.status(404).json({ success: false, error: 'Property not found' });
      }

      const rentDistributions = await prisma.rentDistribution.findMany({
        where: {
          propertyId,
          distributedAt: { gte: periodStart, lte: periodEnd },
        },
      });

      const rentByUser: Record<string, number> = {};
      for (const rd of rentDistributions) {
        const uid = rd.userId;
        rentByUser[uid] = (rentByUser[uid] || 0) + Number(rd.netAmount);
      }

      const statements = [];
      for (const holding of property.holdings) {
        const user = holding.user as any;
        const rent = rentByUser[holding.userId] || 0;
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

        const statementText = [
          `INVESTOR STATEMENT — ${periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          `Investor: ${name}`,
          `Property: ${property.name}`,
          `Tokens Held: ${holding.quantity}`,
          `Average Cost: $${Number(holding.averageCost).toFixed(2)}`,
          `Total Invested: $${Number(holding.totalInvested).toFixed(2)}`,
          `Period: ${periodStart.toLocaleDateString()} – ${periodEnd.toLocaleDateString()}`,
          `Rent Distribution: $${rent.toFixed(2)}`,
          `Cumulative Rent Earned: $${Number(holding.rentEarned).toFixed(2)}`,
          `---`,
          `This statement is for informational purposes only and does not constitute tax or legal advice.`,
        ].join('\n');

        const stmt = await (prisma as any).investorStatement.create({
          data: {
            userId: holding.userId,
            propertyId,
            periodStart,
            periodEnd,
            statementText,
          },
        });
        statements.push(stmt);
      }

      return res.json({ success: true, data: { count: statements.length, statements } });
    } catch (error: any) {
      console.error('[servicing] Error generating statements:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

router.get(
  '/property/:propertyId/statements',
  simpleAuth,
  loadUserWithRole,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;

      if (isDemoMode(req)) {
        const now = new Date();
        const demoStatements = [
          {
            id: 'demo_stmt_1',
            userId: 'demo_user_1',
            propertyId,
            periodStart: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
            periodEnd: new Date(now.getFullYear(), now.getMonth(), 0).toISOString(),
            createdAt: new Date(now.getTime() - 86400000).toISOString(),
          },
        ];
        return res.json({ success: true, data: demoStatements });
      }

      const statements = await (prisma as any).investorStatement.findMany({
        where: { propertyId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, userId: true, propertyId: true, periodStart: true, periodEnd: true, createdAt: true },
      });

      return res.json({ success: true, data: statements });
    } catch (error: any) {
      console.error('[servicing] Error listing statements:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  },
);

export default router;
